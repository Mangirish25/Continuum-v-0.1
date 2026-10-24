import asyncio
import os
import sys
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import AsyncSessionLocal, engine, Base
from app.db.models.all_models import Admin, Employee, Project, EmployeeResource, KnowledgeDocument, RiskScore, OAuthConnection
from app.core.security import get_password_hash, encrypt_token
from app.services.risk_service import risk_service
from app.knowledge.pipeline import ingestion_pipeline
from app.core.logging import logger

async def seed_data():
    logger.info("Resetting and seeding database with realistic Continuum v0.1 demonstration data...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Admin User
        admin = Admin(
            id="admin_01",
            email="admin@continuum.io",
            password_hash=get_password_hash("ContinuumAdmin2026!"),
            name="Company Administrator"
        )
        session.add(admin)

        # 2. Employees
        rahul = Employee(
            id="emp_rahul",
            name="Rahul Sharma",
            email="rahul.sharma@company.com",
            role="Lead Backend Engineer",
            team="Core Engineering",
            status="LEAVING", # Target for Handover workflow
            skills=["Python", "FastAPI", "Stripe", "PostgreSQL", "System Architecture"],
            jira_account_id="jira_rahul_01"
        )

        priya = Employee(
            id="emp_priya",
            name="Priya Deshmukh",
            email="priya.deshmukh@company.com",
            role="Senior Platform Engineer",
            team="Infrastructure",
            status="ACTIVE",
            skills=["Go", "Kubernetes", "Redis", "Kafka", "AWS"],
            jira_account_id="jira_priya_02"
        )

        aditi = Employee(
            id="emp_aditi",
            name="Aditi Patil",
            email="aditi.patil@company.com",
            role="Senior Frontend Engineer",
            team="Product Engineering",
            status="ACTIVE",
            skills=["React", "TypeScript", "TailwindCSS", "Next.js"],
            jira_account_id="jira_aditi_03"
        )

        akash = Employee(
            id="emp_akash",
            name="Akash Mehta",
            email="akash.mehta@company.com",
            role="DevOps & Site Reliability Engineer",
            team="Infrastructure",
            status="ACTIVE",
            skills=["Terraform", "Docker", "CI/CD", "Monitoring", "Python"],
            jira_account_id="jira_akash_04"
        )

        shivay = Employee(
            id="emp_shivay",
            name="Shivay Oberoi",
            email="shivay.oberoi@company.com",
            role="Senior Backend Developer",
            team="Engineering",
            status="ACTIVE",
            skills=["FastAPI", "Python", "PostgreSQL", "Payment Gateway Architecture", "Distributed Systems"],
            jira_account_id="jira_shivay_05"
        )

        session.add_all([rahul, priya, aditi, akash, shivay])
        await session.flush()

        # 3. Projects
        p_pay = Project(
            id="proj_pay",
            name="Payment Platform",
            description="Core payment processing engine handling credit cards, webhooks, and billing reconciliation.",
            status="ACTIVE"
        )

        p_auth = Project(
            id="proj_auth",
            name="Authentication Service",
            description="OAuth2 and SSO identity provider for internal and client applications.",
            status="ACTIVE"
        )

        p_analytics = Project(
            id="proj_analytics",
            name="Analytics Platform",
            description="Real-time event stream processing and business metric aggregation.",
            status="ACTIVE"
        )

        p_infra = Project(
            id="proj_infra",
            name="Developer Infrastructure",
            description="Internal developer tooling, CI/CD pipelines, and cloud platform infrastructure.",
            status="ACTIVE"
        )

        p_pay.employees = [rahul, priya, shivay]
        p_auth.employees = [priya, aditi]
        p_analytics.employees = [aditi, akash]
        p_infra.employees = [akash, priya]

        session.add_all([p_pay, p_auth, p_analytics, p_infra])
        await session.flush()

        # 4. Centralized Jira OAuth Connection (Administrator-Managed)
        jira_central = OAuthConnection(
            id="oauth_jira_central",
            provider="JIRA",
            connection_type="ADMIN",
            access_token_encrypted=encrypt_token("mock_jira_admin_token"),
            provider_account_id="https://continuum.atlassian.net",
            scopes=["read:jira-work", "admin_email:admin@continuum.io", "verified:true"]
        )
        session.add(jira_central)
        await session.flush()

        # 5. Resources
        res_github = EmployeeResource(
            id="res_gh_pay",
            employee_id=rahul.id,
            project_id=p_pay.id,
            provider="GITHUB",
            resource_type="REPOSITORY",
            external_resource_id="octocat/Hello-World",
            external_url="https://github.com/octocat/Hello-World",
            name="Payment Gateway Repository",
            status="CONNECTED"
        )

        res_gdrive = EmployeeResource(
            id="res_gd_pay",
            employee_id=rahul.id,
            project_id=p_pay.id,
            provider="GOOGLE_DRIVE",
            resource_type="FOLDER",
            external_resource_id="folder_gdrive_payments",
            external_url="https://drive.google.com/drive/folders/folder_gdrive_payments",
            name="Payment Architecture & Runbooks",
            status="CONNECTED"
        )

        res_gdrive_shivay = EmployeeResource(
            id="res_gd_shivay",
            employee_id=shivay.id,
            project_id=p_pay.id,
            provider="GOOGLE_DRIVE",
            resource_type="FOLDER",
            external_resource_id="folder_gdrive_architecture",
            external_url="https://drive.google.com/drive/folders/folder_gdrive_architecture",
            name="Architecture & Engineering Docs",
            status="CONNECTED"
        )

        res_notion = EmployeeResource(
            id="res_no_infra",
            employee_id=akash.id,
            project_id=p_infra.id,
            provider="NOTION",
            resource_type="PAGE",
            external_resource_id="notion_page_infra",
            external_url="https://notion.so/notion_page_infra",
            name="DevOps Infrastructure Runbook",
            status="CONNECTED"
        )

        res_jira = EmployeeResource(
            id="res_ji_pay",
            employee_id=rahul.id,
            project_id=p_pay.id,
            provider="JIRA",
            resource_type="PROJECT_ISSUES",
            external_resource_id="PAY",
            external_url="https://continuum.atlassian.net/browse/PAY",
            name="Jira - Payment Platform Issues",
            status="CONNECTED"
        )

        res_jira_shivay = EmployeeResource(
            id="res_ji_shivay",
            employee_id=shivay.id,
            project_id=p_pay.id,
            provider="JIRA",
            resource_type="PROJECT_ISSUES",
            external_resource_id="PAY",
            external_url="https://continuum.atlassian.net/browse/PAY",
            name="Jira - Backend Services Tasks",
            status="CONNECTED"
        )

        session.add_all([res_github, res_gdrive, res_gdrive_shivay, res_notion, res_jira, res_jira_shivay])
        await session.commit()

        # 6. Run Ingestion Pipeline on Resources
        logger.info("Synchronizing and indexing knowledge documents for seed resources...")
        await ingestion_pipeline.run_sync_for_resource(res_github.id, session)
        await ingestion_pipeline.run_sync_for_resource(res_gdrive.id, session)
        await ingestion_pipeline.run_sync_for_resource(res_gdrive_shivay.id, session)
        await ingestion_pipeline.run_sync_for_resource(res_notion.id, session)
        await ingestion_pipeline.run_sync_for_resource(res_jira.id, session)
        await ingestion_pipeline.run_sync_for_resource(res_jira_shivay.id, session)

        # 6. Calculate Risk Scores
        logger.info("Calculating risk scores and bus factors for projects...")
        await risk_service.calculate_project_risk(p_pay.id, session)
        await risk_service.calculate_project_risk(p_auth.id, session)
        await risk_service.calculate_project_risk(p_analytics.id, session)
        await risk_service.calculate_project_risk(p_infra.id, session)

        logger.info("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
