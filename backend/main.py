"""
Draw Odds API — FastAPI entrypoint.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
import models  # noqa: ensure all models are registered before create_all
from routers.hunts import router as hunts_router, states_router
from routers.odds import router as odds_router
from routers.admin import router as admin_router

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Draw Odds API",
    description="Big game draw odds database for western US states",
    version="1.0.0",
)

# CORS — allow frontend origin in dev; tighten in production via env var
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://draw-odds-frontend.onrender.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ENV") == "development" else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(hunts_router)
app.include_router(states_router)
app.include_router(odds_router)
app.include_router(admin_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# Serve React build in production
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
