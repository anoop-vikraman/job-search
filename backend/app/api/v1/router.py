from fastapi import APIRouter

from app.api.v1 import (
    addresses,
    admin,
    auth,
    conversations,
    devices,
    kyc,
    media,
    notifications,
    ratings,
    refunds,
    reports,
    tweaks,
    users,
    wallet,
    watchlist,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(addresses.router)
api_router.include_router(tweaks.router)
api_router.include_router(watchlist.router)
api_router.include_router(wallet.router)
api_router.include_router(refunds.router)
api_router.include_router(ratings.router)
api_router.include_router(notifications.router)
api_router.include_router(conversations.router)
api_router.include_router(devices.router)
api_router.include_router(reports.router)
api_router.include_router(kyc.router)
api_router.include_router(media.router)
api_router.include_router(admin.router)
