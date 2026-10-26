from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import ContinuumException
from app.core.logging import logger
from app.db.database import engine, AsyncSessionLocal, upgrade_existing_sqlite_schema
from app.db.models.all_models import Base, Admin
from app.core.security import get_password_hash
from sqlalchemy import select

from app.api.routes import (
    auth, employees, projects,
    resources, sources, knowledge, risk, handovers,
    dashboard, notifications, health
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Error Handling
@app.exception_handler(ContinuumException)
async def continuum_exception_handler(request: Request, exc: ContinuumException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred."}}
    )

# Register API Routers
v1 = settings.API_V1_STR
app.include_router(health.router)
app.include_router(auth.router, prefix=v1)
app.include_router(employees.router, prefix=v1)
app.include_router(projects.router, prefix=v1)
app.include_router(resources.router, prefix=v1)
app.include_router(sources.router, prefix=v1)
app.include_router(knowledge.router, prefix=v1)
app.include_router(risk.router, prefix=v1)
app.include_router(handovers.router, prefix=v1)
app.include_router(dashboard.router, prefix=v1)
app.include_router(notifications.router, prefix=v1)

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database tables and admin seed...")
    async with engine.begin() as conn:
        await conn.run_sync(upgrade_existing_sqlite_schema)
        await conn.run_sync(Base.metadata.create_all)

    # Ensure Initial Admin user exists
    async with AsyncSessionLocal() as session:
        stmt = select(Admin).where(Admin.email == settings.INITIAL_ADMIN_EMAIL)
        res = await session.execute(stmt)
        admin = res.scalar_one_or_none()
        if not admin:
            admin = Admin(
                email=settings.INITIAL_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                name=settings.INITIAL_ADMIN_NAME
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Created default Admin user: {settings.INITIAL_ADMIN_EMAIL}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
