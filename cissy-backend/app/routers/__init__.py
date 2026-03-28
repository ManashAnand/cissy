from fastapi import APIRouter

from app.config import settings
from app.routers import bi, conversations, dashboard, health, query

router = APIRouter(prefix=settings.api_v1_prefix)
router.include_router(health.router, tags=["health"])
router.include_router(dashboard.router, tags=["dashboard"])
router.include_router(conversations.router, tags=["conversations"])
router.include_router(query.router, tags=["query"])
router.include_router(bi.router, prefix="/bi", tags=["bi"])
