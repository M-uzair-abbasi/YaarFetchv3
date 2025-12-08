from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import auth, orders, offers, chat


def create_app() -> FastAPI:
    app = FastAPI(title="YaarFetch API", version="0.1.0")

    # Explicit CORS configuration; wildcard for dev, override with ALLOWED_ORIGINS in prod
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(orders.router, prefix="/orders", tags=["orders"])
    app.include_router(offers.router, prefix="/offers", tags=["offers"])
    app.include_router(chat.router, prefix="/chat", tags=["chat"])

    return app


app = create_app()


