"""
schemas/message.py 테스트
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from backend.schemas.message import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    Message,
    MessageBase,
    MessageCreate,
    MessageRole,
)


class TestMessageSchemas:
    """메시지 스키마 테스트"""

    def test_message_role_enum(self):
        """MessageRole 열거형 테스트"""
        assert "user" in MessageRole.__args__
        assert "assistant" in MessageRole.__args__
        assert "system" in MessageRole.__args__

    def test_message_base_valid(self):
        """유효한 MessageBase 생성 테스트"""
        message = MessageBase(role="user", content="테스트 메시지")

        assert message.role == "user"
        assert message.content == "테스트 메시지"

    def test_message_base_invalid_role(self):
        """유효하지 않은 역할로 MessageBase 생성 테스트"""
        with pytest.raises(ValidationError):
            MessageBase(role="invalid", content="메시지")

    def test_message_base_empty_content(self):
        """빈 내용으로 MessageBase 생성 테스트"""
        with pytest.raises(ValidationError) as exc_info:
            MessageBase(role="user", content="")

        assert "at least 1 character" in str(exc_info.value)

    def test_message_create(self):
        """MessageCreate 스키마 테스트"""
        message = MessageCreate(node_id="node-123", role="assistant", content="AI 응답")

        assert message.node_id == "node-123"
        assert message.role == "assistant"

    def test_message_response(self):
        """Message 응답 스키마 테스트"""
        now = datetime.now()
        message = Message(
            id="msg-123",
            node_id="node-123",
            role="user",
            content="사용자 메시지",
            timestamp=now,
            embedding=[0.1, 0.2, 0.3],
        )

        assert message.id == "msg-123"
        assert message.timestamp == now
        assert len(message.embedding) == 3

    def test_message_without_embedding(self):
        """임베딩 없는 Message 테스트"""
        now = datetime.now()
        message = Message(
            id="msg-123", node_id="node-123", role="system", content="시스템 메시지", timestamp=now
        )

        assert message.embedding is None

    def test_chat_message(self):
        """ChatMessage 스키마 테스트"""
        chat = ChatMessage(role="user", content="채팅 메시지")

        assert chat.role == "user"
        assert chat.content == "채팅 메시지"

    def test_chat_request(self):
        """ChatRequest 스키마 테스트"""
        request = ChatRequest(
            session_id="session-123", node_id="node-123", message="사용자 질문", auto_branch=True
        )

        assert request.session_id == "session-123"
        assert request.message == "사용자 질문"
        assert request.auto_branch is True

    def test_chat_request_no_auto_branch(self):
        """자동 분기 비활성화 ChatRequest 테스트"""
        request = ChatRequest(
            session_id="session-123", node_id="node-123", message="사용자 질문", auto_branch=False
        )

        assert request.auto_branch is False

    def test_chat_request_default_auto_branch(self):
        """기본 자동 분기 설정 테스트"""
        request = ChatRequest(session_id="session-123", node_id="node-123", message="사용자 질문")

        assert request.auto_branch is True  # 기본값

    def test_chat_response(self):
        """ChatResponse 스키마 테스트"""
        response = ChatResponse(
            response="AI 응답입니다",
            node_id="node-123",
            new_nodes=["branch-1", "branch-2"],
            branched=True,
        )

        assert response.response == "AI 응답입니다"
        assert len(response.new_nodes) == 2
        assert response.branched is True

    def test_chat_response_no_branch(self):
        """분기 없는 ChatResponse 테스트"""
        response = ChatResponse(response="단순 응답", node_id="node-123")

        assert response.new_nodes == []
        assert response.branched is False

    def test_chat_response_with_empty_new_nodes(self):
        """빈 new_nodes로 ChatResponse 생성 테스트"""
        response = ChatResponse(response="응답", node_id="node-123", new_nodes=[], branched=False)

        assert response.new_nodes == []
        assert response.branched is False
