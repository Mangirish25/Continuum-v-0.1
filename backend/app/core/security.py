import base64
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
import httpx
from cryptography.fernet import Fernet
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

async def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify access token issued by Supabase Auth or local developer JWT.
    Validates expiration, signature, and extracts user ID (sub) and email.
    """
    # 1. If SUPABASE_JWT_SECRET is explicitly configured, decode directly
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            if payload.get("sub"):
                return {
                    "sub": payload.get("sub"),
                    "email": payload.get("email"),
                    "role": payload.get("role", "authenticated"),
                    "user_metadata": payload.get("user_metadata", {})
                }
        except jwt.PyJWTError:
            pass

    # 2. Check live Supabase Auth API if URL is configured
    if settings.SUPABASE_URL and "placeholder" not in settings.SUPABASE_URL:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": settings.SUPABASE_KEY
                    },
                    timeout=5.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "sub": data.get("id"),
                        "email": data.get("email"),
                        "role": data.get("role", "authenticated"),
                        "user_metadata": data.get("user_metadata", {})
                    }
        except Exception:
            pass

    # 3. Fallback for test suite / local dev tokens signed with JWT_SECRET
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub"):
            return {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role", "authenticated"),
                "user_metadata": payload.get("user_metadata", {})
            }
    except jwt.PyJWTError:
        pass

    return None

# OAuth Token Encryption (Fernet / AES)
def _get_fernet() -> Fernet:
    key_bytes = settings.TOKEN_ENCRYPTION_KEY.encode('utf-8')
    try:
        return Fernet(key_bytes)
    except Exception:
        derived = base64.urlsafe_b64encode(settings.JWT_SECRET.zfill(32)[:32].encode('utf-8'))
        return Fernet(derived)

def encrypt_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    fernet = _get_fernet()
    return fernet.encrypt(token.encode('utf-8')).decode('utf-8')

def decrypt_token(encrypted_token: Optional[str]) -> Optional[str]:
    if not encrypted_token:
        return None
    try:
        fernet = _get_fernet()
        return fernet.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')
    except Exception:
        return None
