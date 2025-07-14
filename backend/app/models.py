from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scans = relationship("Scan", back_populates="user")
    credentials = relationship("UserCredentials", back_populates="user")

class UserCredentials(Base):
    __tablename__ = "user_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    service = Column(String)  # 'github', 'openai', etc.
    encrypted_token = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="credentials")

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    domain = Column(String, index=True)
    status = Column(String, default="pending")  # pending, running, completed, failed
    risk_score = Column(Float, default=0.0)
    findings_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="scans")
    results = relationship("ScanResult", back_populates="scan")

class ScanResult(Base):
    __tablename__ = "scan_results"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"))
    repository = Column(String)
    file_path = Column(String)
    finding = Column(Text)
    risk_score = Column(Float)
    classification = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # GitHub-specific fields
    github_url = Column(String, nullable=True)
    raw_content = Column(Text, nullable=True)  # Store snippet for context
    
    # Relationships
    scan = relationship("Scan", back_populates="results")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")