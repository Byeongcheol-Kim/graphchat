"""
schemas/websocket.py 테스트
"""

import pytest
from pydantic import ValidationError

from backend.schemas.websocket import WSChatMessage, WSError, WSMessage, WSMessageType, WSNodeUpdate


class TestWebSocketSchemas:
    """WebSocket 스키마 테스트"""

    def test_ws_message_type_enum(self):
        """WSMessageType 열거형 테스트"""
        assert "chat" in WSMessageType.__args__
        assert "node_created" in WSMessageType.__args__
        assert "node_updated" in WSMessageType.__args__
        assert "summary_created" in WSMessageType.__args__
        assert "branch_detected" in WSMessageType.__args__
        assert "error" in WSMessageType.__args__
        assert "connection" in WSMessageType.__args__

    def test_ws_message_base(self):
        """WSMessage 기본 스키마 테스트"""
        message = WSMessage(type="chat", data={"key": "value"})

        assert message.type == "chat"
        assert message.data == {"key": "value"}

    def test_ws_message_invalid_type(self):
        """유효하지 않은 타입으로 WSMessage 생성 테스트"""
        with pytest.raises(ValidationError):
            WSMessage(type="invalid_type", data={"key": "value"})

    def test_ws_chat_message(self):
        """WSChatMessage 스키마 테스트"""
        chat = WSChatMessage(session_id="session-123", node_id="node-123", content="테스트 메시지")

        assert chat.session_id == "session-123"
        assert chat.node_id == "node-123"
        assert chat.content == "테스트 메시지"

    def test_ws_chat_message_default_auto_branch(self):
        """WSChatMessage 필수 필드 테스트"""
        chat = WSChatMessage(session_id="session-123", node_id="node-123", content="테스트 메시지")

        assert chat.session_id == "session-123"
        assert chat.content == "테스트 메시지"

    def test_ws_node_update(self):
        """WSNodeUpdate 스키마 테스트"""
        update = WSNodeUpdate(
            node_id="node-123",
            session_id="session-456",
            action="updated",
            node_data={"title": "수정된 제목", "is_active": False},
        )

        assert update.node_id == "node-123"
        assert update.session_id == "session-456"
        assert update.action == "updated"
        assert update.node_data["title"] == "수정된 제목"

    def test_ws_node_update_partial(self):
        """부분 업데이트 WSNodeUpdate 테스트"""
        update = WSNodeUpdate(node_id="node-123", session_id="session-456", action="created")

        assert update.node_id == "node-123"
        assert update.session_id == "session-456"
        assert update.action == "created"
        assert update.node_data is None

    def test_ws_error(self):
        """WSError 스키마 테스트"""
        error = WSError(error="잘못된 요청입니다", details="field: node_id, reason: not found")

        assert error.error == "잘못된 요청입니다"
        assert error.details == "field: node_id, reason: not found"

    def test_ws_error_without_details(self):
        """상세 정보 없는 WSError 테스트"""
        error = WSError(error="서버 오류")

        assert error.error == "서버 오류"
        assert error.details is None

    def test_ws_message_with_nested_data(self):
        """중첩된 데이터를 가진 WSMessage 테스트"""
        message = WSMessage(
            type="node_created",
            data={
                "node": {"id": "node-123", "title": "새 노드", "children": []},
                "parent_id": "parent-123",
            },
        )

        assert message.data["node"]["id"] == "node-123"
        assert message.data["parent_id"] == "parent-123"

    def test_ws_message_serialization(self):
        """WSMessage 직렬화 테스트"""
        message = WSMessage(type="branch_detected", data={"updated_field": "value"})

        json_data = message.model_dump()

        assert json_data["type"] == "branch_detected"
        assert json_data["data"]["updated_field"] == "value"
