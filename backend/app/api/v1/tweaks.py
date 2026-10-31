import uuid
from typing import Any

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.application import (
    ApplicationCreate,
    ApplicationDetail,
    ApplicationResponse,
    CounterQuoteRequest,
    MyApplication,
    OfferResponse,
    ProviderSummary,
)
from app.schemas.common import ErrorResponse, Page
from app.schemas.tweak import FeedSort, TweakCreate, TweakResponse, TweakUpdate
from app.services import application_service, tweak_service

router = APIRouter(prefix="/tweaks", tags=["tweaks"])

ERRORS: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
}


@router.get(
    "",
    response_model=Page[TweakResponse],
    status_code=status.HTTP_200_OK,
    responses={422: {"model": ErrorResponse}},
)
async def list_tweaks(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: str | None = None,
    search: str | None = Query(None, max_length=100),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    radius_km: float | None = Query(None, gt=0, le=500),
    sort: FeedSort = FeedSort.newest,
) -> Page[TweakResponse]:
    """Marketplace feed: active tweaks not owned by the viewer.

    `search` matches title, description, category and skills (case-insensitive).
    Passing `lat`/`lng` adds `distance_km` to each item; `radius_km` and `sort=distance`
    require them.
    """
    rows, total = await tweak_service.list_feed(
        db,
        viewer_id=user.id,
        page=page,
        limit=limit,
        category=category,
        search=search,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        sort=sort,
    )
    return Page(
        items=[
            TweakResponse.model_validate(t).model_copy(update={"distance_km": d}) for t, d in rows
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/mine", response_model=list[TweakResponse])
async def list_my_tweaks(user: CurrentUser, db: DbSession) -> list[TweakResponse]:
    """Tweaks created by the authenticated user (any status)."""
    rows = await tweak_service.list_my_tweaks(db, user.id)
    return [TweakResponse.model_validate(t) for t in rows]


@router.post(
    "", response_model=TweakResponse, status_code=status.HTTP_201_CREATED, responses=ERRORS
)
async def create_tweak(data: TweakCreate, user: CurrentUser, db: DbSession) -> TweakResponse:
    """Create a tweak (draft or active)."""
    tweak = await tweak_service.create_tweak(db, user.id, data)
    return TweakResponse.model_validate(tweak)


@router.get("/{tweak_id}", response_model=TweakResponse, responses=ERRORS)
async def get_tweak(tweak_id: uuid.UUID, user: CurrentUser, db: DbSession) -> TweakResponse:
    """Fetch a single tweak by id."""
    tweak = await tweak_service.get_tweak(db, tweak_id)
    return TweakResponse.model_validate(tweak)


@router.patch("/{tweak_id}", response_model=TweakResponse, responses=ERRORS)
async def update_tweak(
    tweak_id: uuid.UUID, data: TweakUpdate, user: CurrentUser, db: DbSession
) -> TweakResponse:
    """Update a tweak (owner only)."""
    tweak = await tweak_service.update_tweak(db, tweak_id, user.id, data)
    return TweakResponse.model_validate(tweak)


@router.delete("/{tweak_id}", status_code=status.HTTP_204_NO_CONTENT, responses=ERRORS)
async def delete_tweak(tweak_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Delete a tweak; if it has an accepted application it is closed instead."""
    await tweak_service.delete_tweak(db, tweak_id, user.id)


@router.post(
    "/{tweak_id}/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def apply_to_tweak(
    tweak_id: uuid.UUID, data: ApplicationCreate, user: CurrentUser, db: DbSession
) -> ApplicationResponse:
    """Apply to a tweak as a provider."""
    application = await application_service.apply(db, tweak_id, user.id, data)
    return ApplicationResponse.model_validate(application)


@router.post(
    "/applications/{application_id}/accept", response_model=ApplicationResponse, responses=ERRORS
)
async def accept_application(
    application_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ApplicationResponse:
    """Accept an application (lister only); places an escrow hold."""
    application = await application_service.accept(db, application_id, user.id)
    return ApplicationResponse.model_validate(application)


@router.post(
    "/applications/{application_id}/reject", response_model=ApplicationResponse, responses=ERRORS
)
async def reject_application(
    application_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ApplicationResponse:
    """Reject an application (lister only)."""
    application = await application_service.reject(db, application_id, user.id)
    return ApplicationResponse.model_validate(application)


@router.post(
    "/applications/{application_id}/counter", response_model=OfferResponse, responses=ERRORS
)
async def counter_quote(
    application_id: uuid.UUID, data: CounterQuoteRequest, user: CurrentUser, db: DbSession
) -> OfferResponse:
    """Counter an applicant's quote (lister only)."""
    offer = await application_service.counter_quote(db, application_id, user.id, data)
    return OfferResponse.model_validate(offer)


@router.post(
    "/applications/{application_id}/complete", response_model=ApplicationResponse, responses=ERRORS
)
async def complete_application(
    application_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ApplicationResponse:
    """Mark accepted work complete (lister only); releases escrow minus platform fee."""
    application = await application_service.complete(db, application_id, user.id)
    return ApplicationResponse.model_validate(application)


@router.post(
    "/applications/{application_id}/cancel", response_model=ApplicationResponse, responses=ERRORS
)
async def cancel_application(
    application_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ApplicationResponse:
    """Cancel accepted work (lister only); refunds the escrow hold to the lister."""
    application = await application_service.cancel(db, application_id, user.id)
    return ApplicationResponse.model_validate(application)


@router.get(
    "/applications/mine", response_model=list[MyApplication], responses=ERRORS
)
async def list_my_applications(user: CurrentUser, db: DbSession) -> list[MyApplication]:
    """Applications the current user submitted as a provider, with each tweak's headline."""
    rows = await application_service.list_for_provider(db, user.id)
    return [
        MyApplication(
            **ApplicationResponse.model_validate(app).model_dump(),
            tweak_title=tweak.title,
            tweak_category=tweak.category,
            tweak_status=tweak.status.value,
        )
        for app, tweak in rows
    ]


@router.get("/{tweak_id}/applications", response_model=list[ApplicationDetail], responses=ERRORS)
async def list_tweak_applications(
    tweak_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> list[ApplicationDetail]:
    """List applications for a tweak (owner only), with provider info and any counter-offer."""
    rows = await application_service.list_for_tweak_detailed(db, tweak_id, user.id)
    return [
        ApplicationDetail(
            **ApplicationResponse.model_validate(app).model_dump(),
            provider=ProviderSummary.model_validate(provider),
            offer=OfferResponse.model_validate(offer) if offer is not None else None,
        )
        for app, provider, offer in rows
    ]
