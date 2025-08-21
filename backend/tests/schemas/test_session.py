"""
schemas/session.py 테스트
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from backend.schemas.node import Node
from backend.schemas.session import (
    Session,
    SessionBase,
    SessionCreate,
    SessionUpdate,
    SessionWithNodes,
)


class TestSessionSchemas:
    """세션 스키마 테스트"""

    def test_session_base_valid(self):
        """유효한 SessionBase 생성 테스트"""
        session = SessionBase(title="테스트 세션", metadata={"key": "value"})

        assert session.title == "테스트 세션"
        assert session.metadata == {"key": "value"}

    def test_session_base_empty_title(self):
        """빈 제목으로 SessionBase 생성 시 검증 오류 테스트"""
        with pytest.raises(ValidationError) as exc_info:
            SessionBase(title="")

        assert "at least 1 character" in str(exc_info.value)

    def test_session_base_long_title(self):
        """긴 제목으로 SessionBase 생성 시 검증 오류 테스트"""
        with pytest.raises(ValidationError) as exc_info:
            SessionBase(title="a" * 201)

        assert "at most 200 characters" in str(exc_info.value)

    def test_session_create(self):
        """SessionCreate 스키마 테스트"""
        session = SessionCreate(title="새 세션", user_id="user-123")

        assert session.title == "새 세션"
        assert session.user_id == "user-123"

    def test_session_create_without_user(self):
        """사용자 ID 없이 SessionCreate 생성 테스트"""
        session = SessionCreate(title="새 세션")

        assert session.title == "새 세션"
        assert session.user_id is None

    def test_session_update(self):
        """SessionUpdate 스키마 테스트"""
        update = SessionUpdate(title="수정된 제목")

        assert update.title == "수정된 제목"
        assert update.metadata is None

    def test_session_update_all_none(self):
        """모든 필드가 None인 SessionUpdate 테스트"""
        update = SessionUpdate()

        assert update.title is None
        assert update.metadata is None

    def test_session_response(self):
        """Session 응답 스키마 테스트"""
        now = datetime.now()
        session = Session(
            id="session-123",
            title="테스트 세션",
            user_id="user-123",
            created_at=now,
            updated_at=now,
            node_count=5,
        )

        assert session.id == "session-123"
        assert session.node_count == 5

    def test_session_with_nodes(self):
        """SessionWithNodes 스키마 테스트"""
        now = datetime.now()
        node = Node(
            id="node-123",
            session_id="session-123",
            title="테스트 노드",
            type="user",
            parent_id=None,
            created_at=now,
            token_count=100,
            depth=0,
            is_active=True,
        )

        session = SessionWithNodes(
            id="session-123",
            title="테스트 세션",
            user_id="user-123",
            created_at=now,
            updated_at=now,
            node_count=1,
            nodes=[node],
        )

        assert len(session.nodes) == 1
        assert session.nodes[0].id == "node-123"

    def test_session_with_empty_nodes(self):
        """빈 노드 리스트를 가진 SessionWithNodes 테스트"""
        now = datetime.now()
        session = SessionWithNodes(
            id="session-123",
            title="테스트 세션",
            user_id="user-123",
            created_at=now,
            updated_at=now,
            node_count=0,
        )

        assert session.nodes == []
        assert session.node_count == 0
