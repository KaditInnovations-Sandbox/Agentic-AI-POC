"""Application configuration for ecommerce_agent."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the ecommerce_agent directory or workspace root
_current_dir = Path(__file__).parent.resolve()
_env_path = _current_dir / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)
else:
    load_dotenv(override=False)


class Settings:
    """Settings loaded from environment variables."""

    @property
    def database_url(self) -> str:
        return os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/ecommerce_demo",
        )

    @property
    def db_schema(self) -> str:
        return os.getenv("DB_SCHEMA", "ecommerce_poc")

    @property
    def mock_user_id(self) -> int:
        """Development-only mock authenticated customer ID."""
        return int(os.getenv("MOCK_USER_ID", "1"))

    @property
    def model(self) -> str:
        # Default to gemini-3.8-flash or env var
        return os.getenv("MODEL", "gemini-3.5-flash-lite")

    @property
    def google_cloud_project(self) -> str | None:
        return os.getenv("GOOGLE_CLOUD_PROJECT")

    @property
    def google_cloud_location(self) -> str:
        return os.getenv("GOOGLE_CLOUD_LOCATION", "global")


settings = Settings()
