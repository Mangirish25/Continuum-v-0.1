from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None
    invite_code: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    name: str
    role: str = "admin"
    created_at: datetime
    updated_at: datetime

class AdminRegisterResponse(BaseModel):
    message: str
    admin: AdminOut
    access_token: Optional[str] = None
    token_type: str = "bearer"
