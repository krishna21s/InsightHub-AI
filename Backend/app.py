from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.vision_tutor import router as vision_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="InsightHub-AI Backend",
        version="0.1.0",
        description="FastAPI backend for InsightHub-AI (starting with Vision Tutor).",
    )

    # CORS (dev-friendly; tighten later)
    allow_origins = os.getenv("CORS_ALLOW_ORIGINS", "*")
    origins = [o.strip() for o in allow_origins.split(",")] if allow_origins else ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {"message": "InsightHub-AI backend is running"}

    @app.get("/health")
    def health():
        return {"status": "ok"}

    # Vision Tutor
    app.include_router(vision_router, prefix="/vision", tags=["vision-tutor"])

    return app


app = create_app()