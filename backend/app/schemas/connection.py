from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ConnectionAuthorizeResponse(BaseModel):
    authorization_url: str
    state: str

class ConnectionCallbackRequest(BaseModel):
    code: str
    state: str

class ConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    connection_type: str
    expires_at: Optional[datetime] = None
    scopes: List[str] = []
    provider_account_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
