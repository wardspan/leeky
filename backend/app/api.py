from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from .database import get_db
from .models import User, Scan, UserCredentials
from .schemas import ScanCreate, ScanResponse, UserCreate, UserResponse, ScanResultResponse, Token
from .auth import get_current_user, create_user, authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from .crud import create_scan, get_user_scans, get_scan_results

router = APIRouter()

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