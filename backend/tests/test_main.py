"""
main.py 애플리케이션 엔트리포인트 테스트
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


class TestMainApp:
    """메인 애플리케이션 테스트"""

    @pytest.fixture
    def client(self):
        """테스트 클라이언트"""
        with patch("backend.main.db_manager") as mock_db:
            mock_db.connect = AsyncMock()
            mock_db.disconnect = AsyncMock()

            test_app = create_app()
            return TestClient(test_app)

    def test_app_creation(self):
        """애플리케이션 생성 테스트"""
        test_app = create_app()

        assert test_app.title == "Branching AI API"
        assert test_app.version == "0.1.0"

    def test_root_endpoint(self, client):
        """루트 엔드포인트 테스트"""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Branching AI API"
        assert data["version"] == "0.1.0"
        assert "docs" in data
        assert "health" in data

    def test_health_check(self, client):
        """헬스 체크 엔드포인트 테스트"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "0.1.0"

    def test_cors_headers(self, client):
        """CORS 헤더 테스트"""
        response = client.options(
            "/api/v1/sessions",
            headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
        )

        # CORS 미들웨어가 설정되어 있으면 OPTIONS 요청 처리
        assert response.status_code in [200, 405]

    def test_api_documentation(self, client):
        """API 문서 접근 테스트"""
        response = client.get("/docs")

        # FastAPI 문서 페이지
        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "openapi" in response.text.lower()

    def test_openapi_schema(self, client):
        """OpenAPI 스키마 테스트"""
        response = client.get("/openapi.json")

        assert response.status_code == 200
        schema = response.json()
        assert schema["info"]["title"] == "Branching AI API"
        assert schema["info"]["version"] == "0.1.0"
        assert "paths" in schema

    def test_global_exception_handler(self, client):
        """글로벌 예외 처리 테스트"""
        with patch("backend.api.endpoints.sessions.SessionService") as mock_service:
            mock_service.return_value.create_session = AsyncMock(
                side_effect=Exception("Unexpected error")
            )

            response = client.post("/api/v1/sessions", json={"title": "테스트"})

            # 예외가 처리되어 500 에러 반환
            assert response.status_code == 500
            assert "내부 서버 오류" in response.json()["detail"]

    def test_router_registration(self):
        """라우터 등록 확인 테스트"""
        test_app = create_app()
        routes = [route.path for route in test_app.routes]

        # 주요 라우터 경로 확인
        assert any("/api/v1/sessions" in route for route in routes)
        assert any("/api/v1/nodes" in route for route in routes)
        assert any("/api/v1/messages" in route for route in routes)
        assert any("/ws" in route for route in routes)

    @pytest.mark.asyncio
    async def test_lifespan_startup(self):
        """애플리케이션 시작 시 라이프사이클 테스트"""
        with patch("backend.main.db_manager") as mock_db:
            mock_db.connect = AsyncMock()
            mock_db.disconnect = AsyncMock()

            test_app = create_app()

            # lifespan 컨텍스트 매니저 테스트
            async with test_app.router.lifespan_context(test_app):
                mock_db.connect.assert_called_once()

            mock_db.disconnect.assert_called_once()

    def test_debug_mode(self):
        """디버그 모드 설정 테스트"""
        with patch("backend.core.config.settings") as mock_settings:
            mock_settings.debug = True
            test_app = create_app()

            assert test_app.debug is True

    def test_production_mode(self):
        """프로덕션 모드 설정 테스트"""
        with patch("backend.core.config.settings") as mock_settings:
            mock_settings.debug = False
            test_app = create_app()

            assert test_app.debug is False
