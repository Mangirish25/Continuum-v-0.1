from typing import Any, Optional, Dict
from fastapi import HTTPException, status

class ContinuumException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={"error": {"code": code, "message": message, "details": self.details}}
        )

class NotFoundException(ContinuumException):
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code="RESOURCE_NOT_FOUND", message=message, details=details)

class UnauthorizedException(ContinuumException):
    def __init__(self, message: str = "Could not validate credentials", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, code="UNAUTHORIZED", message=message, details=details)

class ForbiddenException(ContinuumException):
    def __init__(self, message: str = "Operation forbidden", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code="FORBIDDEN", message=message, details=details)

class BadRequestException(ContinuumException):
    def __init__(self, message: str = "Invalid request payload", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, code="BAD_REQUEST", message=message, details=details)

class ConflictException(ContinuumException):
    def __init__(self, message: str = "Resource already exists or conflicts with current state", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code="RESOURCE_CONFLICT", message=message, details=details)
