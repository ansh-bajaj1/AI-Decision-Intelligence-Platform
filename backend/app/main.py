from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api import auth, dashboard, analytics, forecast, reports, ai, search, orders

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SaaS Decision Intelligence Platform with Anomaly Detection and Forecasting",
    version="1.0.0"
)

# CORS configuration
# Allowing frontend local dev and container configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Database schemas on startup
@app.on_event("startup")
def startup_db_init():
    try:
        logger.info("Initializing database schemas...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database schemas initialized successfully.")
        
        # Auto-seed database if empty
        logger.info("Checking and seeding database records...")
        from database.seed import seed_database
        seed_database()
        logger.info("Database check/seed completed successfully.")
    except Exception as e:
        logger.error(f"Error initializing database schemas on startup: {e}")

# Include Router Modules
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "database": "connected"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
