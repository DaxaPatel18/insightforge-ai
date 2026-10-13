import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import init_db, check_db_connection
from app.api.datasets import router as datasets_router
from app.api.eda import router as eda_router
from app.api.ml import router as ml_router
from app.api.agents import router as agents_router
from app.api.rag import router as rag_router
from app.api.reports import router as reports_router
from app.api.evaluations import router as evaluations_router
from app.api.auth import router as auth_router
from app.api.contact import router as contact_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    yield


app = FastAPI(
    title="InsightForge AI Backend API",
    description="Agentic Data Science & Machine Learning Platform API",
    version="0.3.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access
# 1. Base allowed origins (Localhost development ports + Default Render static site production origin)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://insightforge-ai.onrender.com",
]

# 2. Allow production frontend origin configured through FRONTEND_ORIGIN environment variable
frontend_origin_env = os.getenv("FRONTEND_ORIGIN", "").strip()
if frontend_origin_env:
    for orig in frontend_origin_env.split(","):
        cleaned = orig.strip().rstrip("/")
        if cleaned and cleaned not in origins:
            origins.append(cleaned)

# 3. Additional CORS origins if defined in environment
additional_origins_env = os.getenv("ADDITIONAL_CORS_ORIGINS", "").strip()
if additional_origins_env:
    for orig in additional_origins_env.split(","):
        cleaned = orig.strip().rstrip("/")
        if cleaned and cleaned not in origins:
            origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type", "Content-Length"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """Inject standard security headers on API responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    return response

# Health check endpoint
@app.get("/health", tags=["system"])
async def health_check():
    """
    Health check endpoint returning system status and database connectivity.
    """
    db_status = check_db_connection()
    overall = "ok" if db_status.get("status") == "healthy" else "degraded"
    return {
        "status": overall,
        "platform": "InsightForge AI",
        "version": "0.3.0",
        "database": db_status,
    }


# Router registrations
app.include_router(auth_router)
app.include_router(contact_router)
app.include_router(datasets_router)
app.include_router(eda_router)
app.include_router(ml_router)
app.include_router(agents_router)
app.include_router(rag_router)
app.include_router(reports_router)
app.include_router(evaluations_router)

