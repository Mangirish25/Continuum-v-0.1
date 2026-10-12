import os
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Continuum Knowledge Continuity Platform"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Database (Supabase PostgreSQL / Local PostgreSQL / SQLite fallback)
    # For Supabase Pooler: postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?ssl=require
    # Fallback to local SQLite when DATABASE_URL is not set or in offline testing
    DATABASE_URL: str = "sqlite+aiosqlite:///continuum_local.db"
    SYNC_DATABASE_URL: Optional[str] = "sqlite:///continuum_local.db"
    
    # Supabase Auth & Project
    SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    SUPABASE_KEY: str = "placeholder-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    
    # Administrator Registration Policy
    # "open" allows any user registering to become a Continuum admin during development.
    # "restricted" requires a matching REGISTRATION_INVITE_CODE for deployment.
    ADMIN_REGISTRATION_MODE: str = "open"
    REGISTRATION_INVITE_CODE: Optional[str] = "CONTINUUM-ADMIN-INVITE-2026"
    
    # Security
    JWT_SECRET: str = "continuum-secret-key-change-in-production-32bytes-min!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    TOKEN_ENCRYPTION_KEY: str = "c2VjcmV0LWtleS0zMi1ieXRlcy1mb3ItYWVzLWVuY3J5cHRpb24=" # 32 base64 bytes
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OAuth Integrations
    GOOGLE_CLIENT_ID: str = "google-client-id-placeholder"
    GOOGLE_CLIENT_SECRET: str = "google-client-secret-placeholder"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/connections/google/callback"
    
    NOTION_CLIENT_ID: str = "notion-client-id-placeholder"
    NOTION_CLIENT_SECRET: str = "notion-client-secret-placeholder"
    NOTION_REDIRECT_URI: str = "http://localhost:8000/api/v1/connections/notion/callback"
    
    JIRA_CLIENT_ID: str = "jira-client-id-placeholder"
    JIRA_CLIENT_SECRET: str = "jira-client-secret-placeholder"
    JIRA_REDIRECT_URI: str = "http://localhost:8000/api/v1/connections/jira/callback"
    
    GITHUB_API_TOKEN: Optional[str] = None
    
    # AI / LLM / Embeddings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"  # Ollama Qwen model variant (e.g. qwen2.5:7b or qwen:8b)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Vector Storage
    CHROMA_URL: Optional[str] = None # None for embedded local Chroma persistent storage
    CHROMA_PERSIST_DIR: str = "./chroma_data"
    
    # Email Service
    EMAIL_PROVIDER: str = "console"  # console, smtp, mock
    EMAIL_API_KEY: Optional[str] = None
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SENDER_EMAIL: str = "admin@continuum.internal"
    
    # Initial Admin Seed
    INITIAL_ADMIN_EMAIL: str = "admin@continuum.io"
    INITIAL_ADMIN_PASSWORD: str = "ContinuumAdmin2026!"
    INITIAL_ADMIN_NAME: str = "Company Administrator"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
