from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List

from .database import get_db
from .models import User, Scan, UserCredentials
from .schemas import ScanCreate, ScanResponse, UserCreate, UserResponse, ScanResultResponse, Token, PasswordResetRequest, PasswordResetConfirm
from .auth import get_current_user, create_user, authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_user_by_email, create_password_reset_token, reset_password
from .crud import create_scan, get_user_scans, get_scan_results
from .services.github_search import execute_github_dorks

router = APIRouter()

def simulate_scan_completion(db: Session, scan: Scan):
    """Execute real GitHub scan and update scan results"""
    from .models import ScanResult
    import base64
    
    try:
        # Update scan status to running
        scan.status = "running"
        db.commit()
        
        # Get user's GitHub token
        github_cred = db.query(UserCredentials).filter(
            UserCredentials.user_id == scan.user_id,
            UserCredentials.service == "github",
            UserCredentials.is_active == True
        ).first()
        
        if not github_cred:
            print("No GitHub credentials found - using simulated scan")
            scan.status = "completed"
            scan.completed_at = datetime.utcnow()
            scan.findings_count = 0
            scan.risk_score = 0.0
            db.commit()
            return scan
        
        # Decrypt GitHub token
        github_token = base64.b64decode(github_cred.encrypted_token.encode()).decode()
        print(f"Using user's GitHub token for scan")
        
        # Execute GitHub search
        print(f"Starting real GitHub scan for domain: {scan.domain}")
        results = execute_github_dorks(github_token, scan.domain)
        
        # Store results in database
        max_risk = 0.0
        for result in results:
            scan_result = ScanResult(
                scan_id=scan.id,
                repository=result["repository"],
                file_path=result["file_path"],
                finding=result["finding"],
                risk_score=result["risk_score"],
                classification=result["classification"],
                github_url=result.get("github_url"),
                raw_content=result.get("raw_content")
            )
            db.add(scan_result)
            max_risk = max(max_risk, result["risk_score"])
        
        # Update scan with results
        scan.status = "completed"
        scan.completed_at = datetime.utcnow()
        scan.findings_count = len(results)
        scan.risk_score = max_risk
        
        db.commit()
        
        print(f"Found {len(results)} GitHub results")
        print(f"Scan completed: {len(results)} findings, max risk: {max_risk}")
        
        return scan
        
    except Exception as e:
        print(f"Error in scan completion: {str(e)}")
        scan.status = "failed"
        scan.completed_at = datetime.utcnow()
        db.commit()
        return scan

# Auth endpoints
@router.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    db_user = create_user(db, user)
    return db_user

@router.post("/auth/login", response_model=Token)
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/password-reset-request")
def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request a password reset token"""
    user = get_user_by_email(db, request.email)
    if not user:
        # Don't reveal whether email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate reset token
    reset_token = create_password_reset_token(db, user.id)
    
    # In a real application, you would send this token via email
    # For now, we'll just return it (not recommended for production)
    print(f"Password reset token for {request.email}: {reset_token}")
    
    return {"message": "If the email exists, a password reset link has been sent", "token": reset_token}

@router.post("/auth/password-reset-confirm")
def confirm_password_reset(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using a valid token"""
    success = reset_password(db, request.token, request.new_password)
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Password has been reset successfully"}

# User endpoints
@router.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Scan endpoints
@router.post("/scans", response_model=ScanResponse)
def create_new_scan(
    scan_data: ScanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create scan record
    scan = create_scan(db, scan_data, current_user.id)
    
    # Simulate scan completion (replace with real OSINT logic later)
    completed_scan = simulate_scan_completion(db, scan)
    
    return completed_scan

@router.get("/scans", response_model=List[ScanResponse])
def get_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scans = get_user_scans(db, current_user.id)
    return scans

@router.get("/scans/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return scan

@router.get("/scans/{scan_id}/results", response_model=List[ScanResultResponse])
def get_scan_results_endpoint(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify scan belongs to user
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    results = get_scan_results(db, scan_id)
    return results

@router.post("/scans/{scan_id}/cancel")
def cancel_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify scan belongs to user
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status not in ["running", "pending"]:
        raise HTTPException(status_code=400, detail="Can only cancel running or pending scans")
    
    # Update scan status to cancelled
    scan.status = "cancelled"
    from datetime import datetime
    scan.completed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Scan cancelled successfully"}

# User credentials endpoints
@router.post("/users/credentials")
def save_user_credentials(
    service: str = Form(...),
    token: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Simple encryption - in production use proper encryption
    import base64
    encrypted_token = base64.b64encode(token.encode()).decode()
    
    # Check if credentials already exist for this service
    existing_cred = db.query(UserCredentials).filter(
        UserCredentials.user_id == current_user.id,
        UserCredentials.service == service
    ).first()
    
    if existing_cred:
        existing_cred.encrypted_token = encrypted_token
        existing_cred.is_active = True
    else:
        new_cred = UserCredentials(
            user_id=current_user.id,
            service=service,
            encrypted_token=encrypted_token,
            is_active=True
        )
        db.add(new_cred)
    
    db.commit()
    return {"message": f"{service} credentials saved successfully"}

@router.get("/users/credentials")
def get_user_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    credentials = db.query(UserCredentials).filter(
        UserCredentials.user_id == current_user.id,
        UserCredentials.is_active == True
    ).all()
    
    # Return only service names, not actual tokens
    return [{"service": cred.service, "configured": True} for cred in credentials]

@router.delete("/users/credentials/{service}")
def delete_user_credentials(
    service: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredentials).filter(
        UserCredentials.user_id == current_user.id,
        UserCredentials.service == service
    ).first()
    
    if cred:
        cred.is_active = False
        db.commit()
    
    return {"message": f"{service} credentials removed"}