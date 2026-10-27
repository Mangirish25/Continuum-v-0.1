import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
from app.core.config import settings

# Robust PBKDF2 Password Hashing (compatible across all Python & OS environments)
SALT = b"continuum_security_salt_2026"

def get_password_hash(password: str) -> str:
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), SALT, 100000)
    return key.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return get_password_hash(plain_password) == hashed_password

# JWT Authentication
def create_access_token(
    subject: Union[str, Any],
    email: Optional[str] = None,
    role: str = "admin",
    expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "role": role
    }
    if email:
        to_encode["email"] = email

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return {}

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Validate an application-issued access token signed with the local JWT secret."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") and payload.get("type") == "access":
            return payload
    except jwt.PyJWTError:
        pass
    return None
