"""
api/endpoints/nodes.py 테스트
"""

from datetime import datetime
from unittest.mock import AsyncMock, Mock

import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from backend.core.container import get_container
from backend.main import app


@pytest.fixture
def mock_node_service():
    """NodeService 모의 객체"""
    service = Mock()
    service.create_node = AsyncMock()
    service.get_node = AsyncMock()
    service.get_node_with_messages = AsyncMock()
    service.get_node_tree = AsyncMock()
    service.update_node = AsyncMock()
    service.delete_node = AsyncMock()
    service.create_branch = AsyncMock()
    service.create_summary = AsyncMock()
    return service


@pytest.fixture
def mock_message_service():
    """MessageService 모의 객체"""
    service = Mock()
    service.get_messages_by_node = AsyncMock()
    return service


@pytest.fixture
def client(mock_node_service, mock_message_service):
    """테스트 클라이언트 with mocked dependencies"""
    # Container override
    container = get_container()
    container.node_service.override(providers.Object(mock_node_service))
    container.message_service.override(providers.Object(mock_message_service))

    # 테스트 후 cleanup
    yield TestClient(app)

    # Reset override
    container.node_service.reset_override()
    container.message_service.reset_override()


class TestNodeEndpoints:
    """노드 엔드포인트 테스트"""

    def test_create_node(self, client, mock_node_service):
        """노드 생성 엔드포인트 테스트"""
        # Given: 노드 생성 응답 설정
        created_at = datetime.now()
        mock_node_service.create_node.return_value = {
            "id": "node-123",
            "session_id": "session-123",
            "title": "테스트 노드",
            "type": "user",
            "parent_id": None,
            "content": "테스트 내용",
            "created_at": created_at,
            "updated_at": None,
            "token_count": 0,
            "depth": 0,
            "is_active": True,
            "metadata": {},
            "is_summary": False,
            "summary_content": None,
            "source_node_ids": None,
        }

        # When: 노드 생성 요청
        response = client.post(
            "/api/v1/nodes",
            json={
                "session_id": "session-123",
                "title": "테스트 노드",
                "type": "user",
                "content": "테스트 내용",
            },
        )

        # Then: 생성 성공 확인
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "node-123"
        assert data["title"] == "테스트 노드"
        mock_node_service.create_node.assert_called_once()

    def test_get_node(self, client, mock_node_service):
        """노드 조회 엔드포인트 테스트"""
        # Given: 노드 조회 응답 설정
        created_at = datetime.now()
        mock_node_service.get_node.return_value = {
            "id": "node-123",
            "session_id": "session-123",
            "title": "테스트 노드",
            "type": "user",
            "parent_id": "node-parent",
            "content": None,
            "created_at": created_at,
            "updated_at": None,
            "token_count": 150,
            "depth": 2,
            "is_active": True,
            "metadata": {},
            "is_summary": False,
            "summary_content": None,
            "source_node_ids": None,
        }

        # When: 노드 조회 요청
        response = client.get("/api/v1/nodes/node-123")

        # Then: 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "node-123"
        assert data["token_count"] == 150
        mock_node_service.get_node.assert_called_once_with("node-123")

    def test_get_node_with_messages(self, client, mock_node_service, mock_message_service):
        """메시지 포함 노드 조회 테스트"""
        # Given: 노드와 메시지 응답 설정
        created_at = datetime.now()
        msg_time = datetime.now()

        mock_node_service.get_node.return_value = {
            "id": "node-123",
            "session_id": "session-123",
            "title": "테스트 노드",
            "type": "user",
            "parent_id": None,
            "content": None,
            "created_at": created_at,
            "updated_at": None,
            "token_count": 100,
            "depth": 0,
            "is_active": True,
            "metadata": {},
            "is_summary": False,
            "summary_content": None,
            "source_node_ids": None,
        }

        mock_message_service.get_messages_by_node.return_value = [
            {
                "id": "msg-1",
                "node_id": "node-123",
                "role": "user",
                "content": "안녕하세요",
                "timestamp": msg_time,
                "embedding": None,
            },
            {
                "id": "msg-2",
                "node_id": "node-123",
                "role": "assistant",
                "content": "안녕하세요!",
                "timestamp": msg_time,
                "embedding": None,
            },
        ]

        # When: 메시지 포함 노드 조회 요청
        response = client.get("/api/v1/nodes/node-123/with-messages")

        # Then: 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "node-123"
        assert len(data["messages"]) == 2
        assert data["messages"][0]["content"] == "안녕하세요"

    def test_get_node_tree(self, client, mock_node_service):
        """노드 트리 조회 테스트"""
        # Given: 트리 구조 응답 설정
        created_at = datetime.now()
        mock_node_service.get_node_tree.return_value = {
            "node": {
                "id": "node-root",
                "session_id": "session-123",
                "title": "루트 노드",
                "type": "root",
                "parent_id": None,
                "content": None,
                "created_at": created_at,
                "updated_at": None,
                "token_count": 0,
                "depth": 0,
                "is_active": True,
                "metadata": {},
                "is_summary": False,
                "summary_content": None,
                "source_node_ids": None,
            },
            "children": [
                {
                    "node": {
                        "id": "node-child",
                        "session_id": "session-123",
                        "title": "자식 노드",
                        "type": "user",
                        "parent_id": "node-root",
                        "content": None,
                        "created_at": created_at,
                        "updated_at": None,
                        "token_count": 50,
                        "depth": 1,
                        "is_active": True,
                        "metadata": {},
                        "is_summary": False,
                        "summary_content": None,
                        "source_node_ids": None,
                    },
                    "children": [],
                }
            ],
        }

        # When: 노드 트리 조회 요청
        response = client.get("/api/v1/nodes/node-root/tree")

        # Then: 트리 조회 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["node"]["id"] == "node-root"
        assert len(data["children"]) == 1
        assert data["children"][0]["node"]["id"] == "node-child"

    def test_update_node(self, client, mock_node_service):
        """노드 수정 엔드포인트 테스트"""
        # Given: 노드 수정 응답 설정
        created_at = datetime.now()
        updated_at = datetime.now()
        mock_node_service.update_node.return_value = {
            "id": "node-123",
            "session_id": "session-123",
            "title": "수정된 노드",
            "type": "user",
            "parent_id": None,
            "content": None,
            "created_at": created_at,
            "updated_at": updated_at,
            "token_count": 100,
            "depth": 0,
            "is_active": False,
            "metadata": {"updated": True},
            "is_summary": False,
            "summary_content": None,
            "source_node_ids": None,
        }

        # When: 노드 수정 요청
        response = client.patch(
            "/api/v1/nodes/node-123",
            json={"title": "수정된 노드", "is_active": False, "metadata": {"updated": True}},
        )

        # Then: 수정 성공 확인
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "수정된 노드"
        assert data["is_active"] is False

    def test_delete_node(self, client, mock_node_service):
        """노드 삭제 엔드포인트 테스트"""
        # Given: 삭제 성공 설정
        mock_node_service.delete_node.return_value = True

        # When: 노드 삭제 요청
        response = client.delete("/api/v1/nodes/node-123")

        # Then: 삭제 성공 확인
        assert response.status_code == 204
        mock_node_service.delete_node.assert_called_once_with("node-123")

    def test_create_branch(self, client, mock_node_service):
        """브랜치 생성 엔드포인트 테스트"""
        # Given: 브랜치 생성 응답 설정
        created_at = datetime.now()

        # parent 노드 조회 응답 설정
        mock_node_service.get_node.return_value = {
            "id": "node-parent",
            "session_id": "session-123",
            "title": "부모 노드",
            "type": "user",
            "parent_id": None,
            "content": None,
            "created_at": created_at,
            "updated_at": None,
            "token_count": 0,
            "depth": 0,
            "is_active": True,
            "metadata": {},
            "is_summary": False,
            "summary_content": None,
            "source_node_ids": None,
        }

        # create_node 호출 시 반환값 설정
        mock_node_service.create_node.side_effect = [
            {
                "id": "branch-1",
                "session_id": "session-123",
                "title": "브랜치 1",
                "type": "branch",
                "parent_id": "node-parent",
                "content": "브랜치 1 내용",
                "created_at": created_at,
                "updated_at": None,
                "token_count": 0,
                "depth": 1,
                "is_active": True,
                "metadata": {},
                "is_summary": False,
                "summary_content": None,
                "source_node_ids": None,
            },
            {
                "id": "branch-2",
                "session_id": "session-123",
                "title": "브랜치 2",
                "type": "branch",
                "parent_id": "node-parent",
                "content": "브랜치 2 내용",
                "created_at": created_at,
                "updated_at": None,
                "token_count": 0,
                "depth": 1,
                "is_active": True,
                "metadata": {},
                "is_summary": False,
                "summary_content": None,
                "source_node_ids": None,
            },
        ]

        # When: 브랜치 생성 요청
        response = client.post(
            "/api/v1/nodes/branches",
            json={
                "parent_id": "node-parent",
                "branches": [
                    {"title": "브랜치 1", "content": "브랜치 1 내용", "type": "branch"},
                    {"title": "브랜치 2", "content": "브랜치 2 내용", "type": "branch"},
                ],
            },
        )

        # Then: 브랜치 생성 성공 확인
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "브랜치 1"
        assert data[1]["title"] == "브랜치 2"

    def test_create_summary(self, client, mock_node_service):
        """요약 생성 엔드포인트 테스트"""
        # Given: 요약 생성 응답 설정
        created_at = datetime.now()
        mock_node_service.create_summary.return_value = {
            "id": "summary-123",
            "session_id": "session-123",
            "title": "요약",
            "type": "summary",
            "parent_id": None,
            "content": None,
            "created_at": created_at,
            "updated_at": None,
            "token_count": 200,
            "depth": 0,
            "is_active": True,
            "metadata": {},
            "is_summary": True,
            "summary_content": "요약된 내용입니다",
            "source_node_ids": ["node-1", "node-2", "node-3"],
        }

        # When: 요약 생성 요청
        response = client.post(
            "/api/v1/nodes/summary",
            json={"node_ids": ["node-1", "node-2", "node-3"], "is_manual": False},
        )

        # Then: 요약 생성 성공 확인
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "summary-123"
        assert data["is_summary"] is True
        assert len(data["source_node_ids"]) == 3
