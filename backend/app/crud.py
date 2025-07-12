from sqlalchemy.orm import Session
from datetime import datetime
import os
from .models import User, Scan, ScanResult, UserCredentials
from .schemas import ScanCreate
from .services.github_search import execute_github_dorks

def create_scan(db: Session, scan_data: ScanCreate, user_id: int):
    scan = Scan(
        user_id=user_id,
        domain=scan_data.domain,
        status="pending"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    # Execute real OSINT scan with GitHub search immediately
    # In production, this should be done asynchronously with a task queue
    scan.status = "running"
    db.commit()
    execute_real_scan(db, scan)
    
    return scan

def get_user_scans(db: Session, user_id: int):
    return db.query(Scan).filter(Scan.user_id == user_id).order_by(Scan.created_at.desc()).all()

def get_scan_results(db: Session, scan_id: int):
    return db.query(ScanResult).filter(ScanResult.scan_id == scan_id).all()

def execute_real_scan(db: Session, scan: Scan):
    """Execute real OSINT scan using GitHub search"""
    try:
        # Get GitHub token from user credentials first, then environment
        github_token = None
        
        # Check user's stored credentials
        user_cred = db.query(UserCredentials).filter(
            UserCredentials.user_id == scan.user_id,
            UserCredentials.service == "github",
            UserCredentials.is_active == True
        ).first()
        
        if user_cred:
            # Simple decryption - in production use proper decryption
            import base64
            github_token = base64.b64decode(user_cred.encrypted_token).decode()
            print(f"Using user's GitHub token for scan")
        else:
            # Fallback to environment variable
            github_token = os.getenv("GITHUB_TOKEN")
            if github_token:
                print("Using environment GitHub token for scan")
        
        if not github_token:
            print("No GitHub token found, marking scan as failed")
            scan.status = "failed"
            scan.completed_at = datetime.utcnow()
            db.commit()
            return
        
        print(f"Starting real GitHub scan for domain: {scan.domain}")
        
        # Execute GitHub dorks
        github_results = execute_github_dorks(github_token, scan.domain)
        
        print(f"Found {len(github_results)} GitHub results")
        
        # Save results to database
        for result_data in github_results:
            result = ScanResult(
                scan_id=scan.id,
                repository=result_data["repository"],
                file_path=result_data["file_path"],
                finding=result_data["finding"],
                risk_score=result_data["risk_score"],
                classification=result_data["classification"],
                github_url=result_data.get("github_url", ""),
                raw_content=result_data.get("raw_content", "")
            )
            db.add(result)
        
        # Calculate accurate risk score and findings count
        findings_count = len(github_results)
        risk_score = max([r["risk_score"] for r in github_results], default=0.0) if findings_count > 0 else 0.0
        
        # Update scan with accurate results
        scan.status = "completed"
        scan.findings_count = findings_count
        scan.risk_score = risk_score
        scan.completed_at = datetime.utcnow()
        
        db.commit()
        
        print(f"Scan completed: {scan.findings_count} findings, max risk: {scan.risk_score}")
        
    except Exception as e:
        print(f"Real scan failed: {str(e)}")
        # Mark scan as failed instead of falling back to simulation
        scan.status = "failed"
        db.commit()

