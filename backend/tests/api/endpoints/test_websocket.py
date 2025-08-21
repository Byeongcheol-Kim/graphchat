"""
api/endpoints/websocket.py 테스트
"""

from unittest.mock import AsyncMock, Mock

import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from backend.core.container import get_container
from backend.main import app


@pytest.fixture
def mock_chat_service():
    """ChatService 모의 객체"""
    service = Mock()
    service.process_chat = AsyncMock()
    service.stream_chat = AsyncMock()
    return service


@pytest.fixture
def mock_node_service():
    """NodeService 모의 객체"""
    service = Mock()
    service.update_node = AsyncMock()
    service.get_node = AsyncMock()
    return service


@pytest.fixture
def client(mock_chat_service, mock_node_service):
    """테스트 클라이언트 with mocked dependencies"""
    # Container override
    container = get_container()
    container.chat_service.override(providers.Object(mock_chat_service))
    container.node_service.override(providers.Object(mock_node_service))

    # 테스트 후 cleanup
    yield TestClient(app)

    # Reset override
    container.chat_service.reset_override()
    container.node_service.reset_override()


class TestWebSocketEndpoint:
    """WebSocket 엔드포인트 테스트"""

    def test_websocket_connect_and_disconnect(self, client):
        """WebSocket 연결 및 해제 테스트"""
        with client.websocket_connect("/ws/session/session-123") as websocket:
            # 연결 성공 확인
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["message"] == "Connected to session session-123"

    def test_websocket_chat_message(self, client, mock_chat_service):
        """WebSocket 채팅 메시지 테스트"""
        # Given: 채팅 서비스 응답 설정
        mock_chat_service.process_chat.return_value = {
            "response": "AI 응답",
            "node_id": "node-123",
            "new_nodes": [],
            "branched": False,
        }

        with client.websocket_connect("/ws/session/session-123") as websocket:
            # 연결 메시지 받기
            websocket.receive_json()

            # When: 채팅 메시지 보내기
            websocket.send_json(
                {
                    "type": "chat",
                    "data": {
                        "node_id": "node-123",
                        "message": "테스트 메시지",
                        "auto_branch": False,
                    },
                }
            )

            # Then: 응답 확인
            response = websocket.receive_json()
            assert response["type"] == "chat_response"
            assert "data" in response

    def test_websocket_node_update(self, client, mock_node_service):
        """WebSocket 노드 업데이트 테스트"""
        # Given: 노드 서비스 응답 설정
        mock_node_service.update_node.return_value = {
            "id": "node-123",
            "title": "수정된 노드",
            "is_active": True,
        }

        with client.websocket_connect("/ws/session/session-123") as websocket:
            # 연결 메시지 받기
            websocket.receive_json()

            # When: 노드 업데이트 메시지 보내기
            websocket.send_json(
                {
                    "type": "node_update",
                    "data": {"node_id": "node-123", "title": "수정된 노드", "is_active": True},
                }
            )

            # Then: 응답 확인
            response = websocket.receive_json()
            assert response["type"] == "node_updated"

    def test_websocket_invalid_message_type(self, client):
        """WebSocket 유효하지 않은 메시지 타입 테스트"""
        with client.websocket_connect("/ws/session/session-123") as websocket:
            # 연결 메시지 받기
            websocket.receive_json()

            # 잘못된 타입의 메시지 보내기
            websocket.send_json({"type": "invalid_type", "data": {}})

            # 에러 응답 받기
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Unknown message type" in response["message"]

    def test_websocket_malformed_json(self, client):
        """WebSocket 잘못된 JSON 테스트"""
        with client.websocket_connect("/ws/session/session-123") as websocket:
            # 연결 메시지 받기
            websocket.receive_json()

            # 잘못된 JSON 보내기
            websocket.send_text("not a json")

            # 에러 응답 받기
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Invalid message format" in response["message"]

    def test_websocket_broadcast(self, client, mock_chat_service):
        """WebSocket 브로드캐스트 테스트"""
        # Given: 채팅 서비스 응답 설정
        mock_chat_service.process_chat.return_value = {
            "response": "브로드캐스트 응답",
            "node_id": "node-123",
            "new_nodes": [],
            "branched": False,
        }

        with client.websocket_connect("/ws/session/session-123") as websocket:
            # 연결 메시지 받기
            websocket.receive_json()

            # 브로드캐스트를 트리거할 채팅 메시지 보내기
            websocket.send_json(
                {
                    "type": "chat",
                    "data": {
                        "node_id": "node-123",
                        "message": "브로드캐스트 테스트",
                        "auto_branch": False,
                    },
                }
            )

            # 응답 받기
            response = websocket.receive_json()
            assert response["type"] == "chat_response"
            # 브로드캐스트는 ConnectionManager에서 처리
