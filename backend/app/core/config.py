from functools import lru_cache
from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Bharat Climate Twin API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(
        default="sqlite:///./bharat_climate.db"
    )
    jwt_secret_key: str = Field(default="change-me-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    backend_cors_origins: list[AnyHttpUrl | str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",


    "https://bharat-climate-twin-proxy.vercel.app",

 
    "https://bharat-climate-twin-proxy-piyushdhals-projects.vercel.app",


    "https://bharat-climate-twin-frontend.onrender.com",
]
    seed_database: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
