import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Table, Integer, Float, Boolean, JSON, Enum
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Association table for employee-project M2M
employee_projects = Table(
    "employee_projects",
    Base.metadata,
    Column("employee_id", String, ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True),
    Column("project_id", String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("role", String, nullable=True),
    Column("joined_at", DateTime, default=utc_now)
)

class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    supabase_user_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    team: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="ACTIVE") # ACTIVE, LEAVING, INACTIVE
    skills: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    jira_account_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    projects = relationship("Project", secondary=employee_projects, back_populates="employees")
    resources = relationship("EmployeeResource", back_populates="employee", cascade="all, delete-orphan")
    documents = relationship("KnowledgeDocument", back_populates="employee", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="employee", cascade="all, delete-orphan")
    handovers = relationship("Handover", foreign_keys="Handover.employee_id", back_populates="employee", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="ACTIVE") # ACTIVE, COMPLETED, ARCHIVED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    employees = relationship("Employee", secondary=employee_projects, back_populates="projects")
    resources = relationship("EmployeeResource", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("KnowledgeDocument", back_populates="project", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="project", cascade="all, delete-orphan")
    handovers = relationship("Handover", back_populates="project", cascade="all, delete-orphan")

class OAuthConnection(Base):
    __tablename__ = "oauth_connections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    provider: Mapped[str] = mapped_column(String, nullable=False) # GOOGLE, NOTION, JIRA, GITHUB
    connection_type: Mapped[str] = mapped_column(String, default="ADMIN") # ADMIN, RESOURCE_OWNER
    access_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    scopes: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    provider_account_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

class EmployeeResource(Base):
    __tablename__ = "employee_resources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    employee_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[str] = mapped_column(String, nullable=False) # GITHUB, GOOGLE_DRIVE, NOTION, JIRA
    resource_type: Mapped[str] = mapped_column(String, nullable=False) # REPOSITORY, FOLDER, PAGE, PROJECT_ISSUES
    external_resource_id: Mapped[str] = mapped_column(String, nullable=False)
    external_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    resource_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="READY") # PENDING, NEEDS_AUTH, READY, SYNCING, SYNCED, FAILED, DISABLED
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_successful_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_sync_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    employee = relationship("Employee", back_populates="resources")
    project = relationship("Project", back_populates="resources")
    documents = relationship("KnowledgeDocument", back_populates="resource", cascade="all, delete-orphan")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    resource_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("employee_resources.id", ondelete="SET NULL"), nullable=True)
    employee_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    source_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    doc_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    resource = relationship("EmployeeResource", back_populates="documents")
    employee = relationship("Employee", back_populates="documents")
    project = relationship("Project", back_populates="documents")
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(String, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    embedding_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    document = relationship("KnowledgeDocument", back_populates="chunks")

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    employee_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    knowledge_score: Mapped[float] = mapped_column(Float, default=0.0)
    continuity_risk: Mapped[float] = mapped_column(Float, default=0.0)
    bus_factor: Mapped[int] = mapped_column(Integer, default=1)
    risk_level: Mapped[str] = mapped_column(String, default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    risk_reasons: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    employee = relationship("Employee", back_populates="risk_scores")
    project = relationship("Project", back_populates="risk_scores")

class Handover(Base):
    __tablename__ = "handovers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    employee_id: Mapped[str] = mapped_column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="DRAFT") # DRAFT, GENERATING, READY_FOR_REVIEW, SENT, FAILED
    generated_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    knowledge_package: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    recommended_successor_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    risk_summary: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    recipient_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="handovers")
    project = relationship("Project", back_populates="handovers")
    recommended_successor = relationship("Employee", foreign_keys=[recommended_successor_id])

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
