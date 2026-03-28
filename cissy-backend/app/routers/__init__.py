from fastapi import APIRouter

from app.config import settings
from app.routers import bi, health

router = APIRouter(prefix=settings.api_v1_prefix)
router.include_router(health.router, tags=["health"])
router.include_router(bi.router, prefix="/bi", tags=["bi"])
