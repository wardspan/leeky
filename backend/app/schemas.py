from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# User schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Scan schemas
class ScanBase(BaseModel):
    domain: str

class ScanCreate(ScanBase):
    pass

class ScanResponse(ScanBase):
    id: int
    user_id: int
    status: str
    risk_score: float
    findings_count: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ScanResult schemas
class ScanResultBase(BaseModel):
    repository: str
    file_path: str
    finding: str
    risk_score: float
    classification: str

class ScanResultResponse(ScanResultBase):
    id: int
    scan_id: int
    created_at: datetime
    github_url: Optional[str] = None
    raw_content: Optional[str] = None
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Password Reset schemas
class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str