"""
core/config.py 테스트
"""

import os
from unittest.mock import patch

from backend.core.config import Settings


class TestSettings:
    """Settings 클래스 테스트"""

    def test_default_settings(self):
        """기본 설정값 테스트"""
        settings = Settings()

        assert settings.app_name == "Branching AI"
        assert settings.debug is True
        assert settings.api_prefix == "/api/v1"
        assert settings.api_host == "0.0.0.0"
        assert settings.api_port == 8000

    def test_environment_override(self):
        """환경 변수 오버라이드 테스트"""
        with patch.dict(os.environ, {"API_PORT": "3000", "DEBUG": "false"}):
            settings = Settings()
            assert settings.api_port == 3000
            assert settings.debug is False

    def test_cors_origins_parsing(self):
        """CORS origins 파싱 테스트"""
        with patch.dict(
            os.environ, {"CORS_ORIGINS": "http://localhost:3000,http://localhost:5173"}
        ):
            settings = Settings()
            assert settings.cors_origins == ["http://localhost:3000", "http://localhost:5173"]

    def test_get_settings_singleton(self):
        """get_settings 싱글톤 패턴 테스트"""
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2


class TestDatabaseSettings:
    """데이터베이스 설정 테스트"""

    def test_falkordb_settings(self):
        """FalkorDB 설정 테스트"""
        settings = Settings()
        assert settings.falkordb_host == "localhost"
        assert settings.falkordb_port == 6379
        assert settings.falkordb_graph == "branching_ai"

    def test_redis_settings(self):
        """Redis 설정 테스트"""
        settings = Settings()
        assert settings.redis_host == "localhost"
        assert settings.redis_port == 6379
        assert settings.redis_db == 0
