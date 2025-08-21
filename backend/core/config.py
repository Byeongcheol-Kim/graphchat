"""
환경 설정 관리
"""

import json

from pydantic import Field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # Google Gemini (필수 LLM 제공자)
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    gemini_model: str = Field(default="gemini-2.0-flash-exp", alias="GEMINI_MODEL")

    # FalkorDB
    falkordb_host: str = Field(default="localhost", alias="FALKORDB_HOST")
    falkordb_port: int = Field(default=6432, alias="FALKORDB_PORT")
    falkordb_graph: str = Field(default="branching_ai", alias="FALKORDB_GRAPH")

    # Application
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8432, alias="API_PORT")
    cors_origins: list[str] = Field(
        default=["http://localhost:3432", "http://localhost:3433", "http://localhost:3434"],
        alias="CORS_ORIGINS",
    )

    # Security
    jwt_secret: str = Field(default="dev-secret-key-change-in-production", alias="JWT_SECRET")

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    debug: bool = Field(default=False, alias="DEBUG")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # 추가 환경 변수 무시
    )

    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        """CORS origins 파싱"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return v.split(",")
        return v

    @property
    def falkordb_url(self) -> str:
        """FalkorDB 연결 URL"""
        return f"redis://{self.falkordb_host}:{self.falkordb_port}"


# 전역 인스턴스 생성 제거 - container.py에서 관리
