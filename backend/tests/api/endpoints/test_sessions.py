"""
api/endpoints/sessions.py 테스트
"""

from datetime import datetime
from unittest.mock import AsyncMock, Mock

import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from backend.core.container import get_container
from backend.main import app


@pytest.fixture
def mock_session_service():
    """SessionService 모의 객체"""
    service = Mock()
    service.create_session = AsyncMock()
    service.get_session = AsyncMock()
    service.list_sessions = AsyncMock()
    service.update_session = AsyncMock()
    service.delete_session = AsyncMock()
    service.get_session_with_nodes = AsyncMock()
    return service


@pytest.fixture
def client(mock_session_service):
    """테스트 클라이언트 with mocked dependencies"""
    # Container override
    container = get_container()
    container.session_service.override(providers.Object(mock_session_service))

    # 테스트 후 cleanup
    yield TestClient(app)

    # Reset override
    container.session_service.reset_override()


class TestSessionEndpoints:
    """세션 엔드포인트 테스트"""

    def test_create_session(self, client, mock_session_service):
        """세션 생성 엔드포인트 테스트"""
        # Given: 세션 생성 응답 설정
        created_at = datetime.now()
        mock_session_service.create_session.return_value = {
            "id": "session-123",
            "title": "테스트 세션",
            "user_id": "user-123",
            "created_at": created_at,
            "updated_at": created_at,
            "node_count": 0,
            "metadata": {},
        }

        # When: 세션 생성 요청
        response = client.post(
            "/api/v1/sessions", json={"title": "테스트 세션", "user_id": "user-123"}
        )

        # Then: 생성 성공 확인
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "session-123"
        assert data["title"] == "테스트 세션"
        mock_session_service.create_session.assert_called_once()

    def test_get_session(self, client, mock_session_service):
        """세션 조회 엔드포인트 테스트"""
        # Given: 세션 조회 응답 설정
        created_at = datetime.now()
        mock_session_service.get_session.return_value = {
            "id": "session-123",
            "title": "테스트 세션",
            "user_id": "user-123",
            "created_at": created_at,
            "updated_at": created_at,
            "node_count": 5,
            "metadata": {},
        }

        # When: 세션 조회 요청
        response = client.get("/api/v1/sessions/session-123")

        # Then: 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "session-123"
        assert data["node_count"] == 5
        mock_session_service.get_session.assert_called_once_with("session-123")

    def test_get_session_not_found(self, client, mock_session_service):
        """존재하지 않는 세션 조회 테스트"""
        # Given: 세션이 없음
        mock_session_service.get_session.return_value = None

        # When: 세션 조회 요청
        response = client.get("/api/v1/sessions/nonexistent")

        # Then: 404 응답 확인
        assert response.status_code == 404
        assert "찾을 수 없습니다" in response.json()["detail"]

    def test_list_sessions(self, client, mock_session_service):
        """세션 목록 조회 엔드포인트 테스트"""
        # Given: 세션 목록 응답 설정
        created_at = datetime.now()
        mock_session_service.list_sessions.return_value = [
            {
                "id": "session-1",
                "title": "세션 1",
                "user_id": "user-123",
                "created_at": created_at,
                "updated_at": created_at,
                "node_count": 3,
                "metadata": {},
            },
            {
                "id": "session-2",
                "title": "세션 2",
                "user_id": "user-123",
                "created_at": created_at,
                "updated_at": created_at,
                "node_count": 7,
                "metadata": {},
            },
        ]

        # When: 세션 목록 요청
        response = client.get("/api/v1/sessions?user_id=user-123")

        # Then: 목록 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "session-1"
        assert data[1]["id"] == "session-2"

    def test_update_session(self, client, mock_session_service):
        """세션 수정 엔드포인트 테스트"""
        # Given: 세션 수정 응답 설정
        created_at = datetime.now()
        updated_at = datetime.now()
        mock_session_service.update_session.return_value = {
            "id": "session-123",
            "title": "수정된 세션",
            "user_id": "user-123",
            "created_at": created_at,
            "updated_at": updated_at,
            "node_count": 5,
            "metadata": {},
        }

        # When: 세션 수정 요청
        response = client.patch("/api/v1/sessions/session-123", json={"title": "수정된 세션"})

        # Then: 수정 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "수정된 세션"
        mock_session_service.update_session.assert_called_once()

    def test_delete_session(self, client, mock_session_service):
        """세션 삭제 엔드포인트 테스트"""
        # Given: 삭제 성공 설정
        mock_session_service.delete_session.return_value = True

        # When: 세션 삭제 요청
        response = client.delete("/api/v1/sessions/session-123")

        # Then: 삭제 성공 확인
        assert response.status_code == 204
        mock_session_service.delete_session.assert_called_once_with("session-123")

    def test_delete_session_not_found(self, client, mock_session_service):
        """존재하지 않는 세션 삭제 테스트"""
        # Given: 삭제 실패 설정
        mock_session_service.delete_session.return_value = False

        # When: 세션 삭제 요청
        response = client.delete("/api/v1/sessions/nonexistent")

        # Then: 404 응답 확인
        assert response.status_code == 404
        assert "찾을 수 없습니다" in response.json()["detail"]
