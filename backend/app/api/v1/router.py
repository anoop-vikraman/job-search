from fastapi import APIRouter

from app.api.v1 import (
    addresses,
    admin,
    auth,
    ratings,
    refunds,
    tweaks,
    users,
    wallet,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(addresses.router)
api_router.include_router(tweaks.router)
api_router.include_router(wallet.router)
api_router.include_router(refunds.router)
api_router.include_router(ratings.router)
api_router.include_router(admin.router)
