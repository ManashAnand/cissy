"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.db.duckdb import init_duckdb, shutdown_duckdb
from app.routers import router as api_v1_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_duckdb()
    try:
        yield
    finally:
        shutdown_duckdb()


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    lifespan=lifespan,
    root_path=settings.root_path or "",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)
