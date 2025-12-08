import os


class Settings:
    """Application configuration pulled from environment variables."""

    def __init__(self) -> None:
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        self.mongo_db_name = os.getenv("MONGO_DB_NAME", "yaarfetch")
        self.jwt_secret = os.getenv("JWT_SECRET", "change-me")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
        )
        # Comma separated origins, default to wildcard for local dev
        raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
        self.allowed_origins = (
            ["*"]
            if raw_origins.strip() == "*"
            else [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        )


settings = Settings()

