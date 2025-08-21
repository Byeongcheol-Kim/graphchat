"""
api/endpoints/messages.py 테스트
"""

from datetime import datetime
from unittest.mock import AsyncMock, Mock

import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from backend.core.container import get_container
from backend.main import app


@pytest.fixture
def mock_message_service():
    """MessageService 모의 객체"""
    service = Mock()
    service.create_message = AsyncMock()
    service.get_message = AsyncMock()
    service.list_messages = AsyncMock()
    service.delete_message = AsyncMock()
    service.get_messages_by_node = AsyncMock()
    service.update_message_embedding = AsyncMock()
    service.search_messages = AsyncMock()
    return service


@pytest.fixture
def mock_chat_service():
    """ChatService 모의 객체"""
    service = Mock()
    service.process_chat = AsyncMock()
    service.stream_chat = AsyncMock()
    service.generate_summary = AsyncMock()
    return service


@pytest.fixture
def client(mock_message_service, mock_chat_service):
    """테스트 클라이언트 with mocked dependencies"""
    # Container override
    container = get_container()
    container.message_service.override(providers.Object(mock_message_service))
    container.chat_service.override(providers.Object(mock_chat_service))

    # 테스트 후 cleanup
    yield TestClient(app)

    # Reset override
    container.message_service.reset_override()
    container.chat_service.reset_override()


class TestMessageEndpoints:
    """메시지 엔드포인트 테스트"""

    def test_create_message(self, client, mock_message_service):
        """메시지 생성 엔드포인트 테스트"""
        # Given: 메시지 생성 응답 설정
        timestamp = datetime.now()
        mock_message_service.create_message.return_value = {
            "id": "msg-123",
            "node_id": "node-123",
            "role": "user",
            "content": "테스트 메시지",
            "timestamp": timestamp,
            "embedding": None,
        }

        # When: 메시지 생성 요청
        response = client.post(
            "/api/v1/messages",
            json={"node_id": "node-123", "role": "user", "content": "테스트 메시지"},
        )

        # Then: 생성 성공 확인
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "msg-123"
        assert data["content"] == "테스트 메시지"
        mock_message_service.create_message.assert_called_once()

    def test_get_message(self, client, mock_message_service):
        """메시지 조회 엔드포인트 테스트"""
        # Given: 메시지 조회 응답 설정
        timestamp = datetime.now()
        mock_message_service.get_message.return_value = {
            "id": "msg-123",
            "node_id": "node-123",
            "role": "assistant",
            "content": "응답 메시지",
            "timestamp": timestamp,
            "embedding": None,
        }

        # When: 메시지 조회 요청
        response = client.get("/api/v1/messages/msg-123")

        # Then: 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "assistant"
        assert data["content"] == "응답 메시지"
        mock_message_service.get_message.assert_called_once_with("msg-123")

    def test_list_messages(self, client, mock_message_service):
        """메시지 목록 조회 엔드포인트 테스트"""
        # Given: 메시지 목록 응답 설정
        timestamp = datetime.now()
        mock_message_service.list_messages.return_value = [
            {
                "id": "msg-1",
                "node_id": "node-123",
                "role": "user",
                "content": "첫 번째 메시지",
                "timestamp": timestamp,
                "embedding": None,
            },
            {
                "id": "msg-2",
                "node_id": "node-123",
                "role": "assistant",
                "content": "두 번째 메시지",
                "timestamp": timestamp,
                "embedding": None,
            },
        ]

        # When: 메시지 목록 요청
        response = client.get("/api/v1/messages?node_id=node-123")

        # Then: 목록 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["content"] == "첫 번째 메시지"
        assert data[1]["content"] == "두 번째 메시지"

    def test_chat_completion(self, client, mock_chat_service):
        """채팅 완성 엔드포인트 테스트"""
        # Given: 채팅 처리 응답 설정
        mock_chat_service.process_chat.return_value = {
            "response": "AI 응답입니다",
            "node_id": "node-123",
            "new_nodes": ["branch-1", "branch-2"],
            "branched": True,
        }

        # When: 채팅 요청
        response = client.post(
            "/api/v1/messages/chat",
            json={
                "session_id": "session-123",
                "node_id": "node-123",
                "message": "질문입니다",
                "auto_branch": True,
            },
        )

        # Then: 채팅 응답 확인
        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "AI 응답입니다"
        assert data["branched"] is True
        assert len(data["new_nodes"]) == 2
        mock_chat_service.process_chat.assert_called_once()

    def test_delete_message(self, client, mock_message_service):
        """메시지 삭제 엔드포인트 테스트"""
        # Given: 삭제 성공 설정
        mock_message_service.delete_message.return_value = True

        # When: 메시지 삭제 요청
        response = client.delete("/api/v1/messages/msg-123")

        # Then: 삭제 성공 확인
        assert response.status_code == 204
        mock_message_service.delete_message.assert_called_once_with("msg-123")

    def test_delete_message_not_found(self, client, mock_message_service):
        """존재하지 않는 메시지 삭제 테스트"""
        # Given: 삭제 실패 설정
        mock_message_service.delete_message.return_value = False

        # When: 메시지 삭제 요청
        response = client.delete("/api/v1/messages/nonexistent")

        # Then: 404 응답 확인
        assert response.status_code == 404
        assert "찾을 수 없습니다" in response.json()["detail"]
