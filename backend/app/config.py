from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # 애플리케이션 설정
    app_name: str = "Branching AI"
    app_version: str = "0.1.0"
    debug: bool = True
    
    # API 설정
    api_v1_prefix: str = "/api/v1"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # 데이터베이스 설정
    falkordb_host: str = "localhost"
    falkordb_port: int = 6379
    falkordb_graph_name: str = "branching_ai"
    
    # OpenAI 설정
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    
    # JWT 설정
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24  # 24시간
    
    # WebSocket 설정
    ws_message_queue: str = "redis://localhost:6379"
    
    # 컨텍스트 관리 설정
    max_context_tokens: int = 100000
    summary_trigger_tokens: int = 80000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()