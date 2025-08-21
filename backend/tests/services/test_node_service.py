"""
services/node_service.py 테스트
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from backend.services.node_service import NodeService
from backend.schemas.node import NodeCreate, NodeUpdate


@pytest.fixture
def mock_db():
    """모의 데이터베이스 fixture"""
    db = Mock()
    db.execute_query = AsyncMock()
    db.execute_write = AsyncMock()
    return db


@pytest.fixture
def node_service(mock_db):
    """NodeService fixture"""
    return NodeService(mock_db)


class TestNodeService:
    """NodeService 테스트"""
    
    @pytest.mark.asyncio
    async def test_create_node(self, node_service, mock_db):
        """노드 생성 테스트"""
        mock_db.execute_write.return_value = True
        mock_db.execute_query.return_value = [{
            "n": {
                "id": "node-123",
                "session_id": "session-123",
                "title": "새 노드",
                "type": "question",
                "parent_id": None,
                "created_at": datetime.now(),
                "token_count": 0,
                "depth": 0,
                "is_active": True
            }
        }]
        
        node_data = NodeCreate(
            title="새 노드",
            type="question",
            content="노드 내용"
        )
        result = await node_service.create_node("session-123", node_data)
        
        assert result["id"] == "node-123"
        assert result["title"] == "새 노드"
        
    @pytest.mark.asyncio
    async def test_create_node_with_parent(self, node_service, mock_db):
        """부모 노드가 있는 노드 생성 테스트"""
        # 부모 노드 조회
        mock_db.execute_query.side_effect = [
            [{"depth": 1}],  # 부모 노드의 depth
            [{
                "n": {
                    "id": "node-child",
                    "parent_id": "node-parent",
                    "depth": 2
                }
            }]
        ]
        mock_db.execute_write.return_value = True
        
        node_data = NodeCreate(
            title="자식 노드",
            type="solution",
            parent_id="node-parent"
        )
        result = await node_service.create_node("session-123", node_data)
        
        assert result["parent_id"] == "node-parent"
        assert result["depth"] == 2
        
    @pytest.mark.asyncio
    async def test_get_node(self, node_service, mock_db):
        """노드 조회 테스트"""
        mock_db.execute_query.return_value = [{
            "n": {
                "id": "node-123",
                "title": "테스트 노드",
                "token_count": 150
            }
        }]
        
        result = await node_service.get_node("node-123")
        
        assert result["id"] == "node-123"
        assert result["token_count"] == 150
        
    @pytest.mark.asyncio
    async def test_get_node_with_messages(self, node_service, mock_db):
        """메시지 포함 노드 조회 테스트"""
        mock_db.execute_query.side_effect = [
            # 노드 조회
            [{
                "n": {
                    "id": "node-123",
                    "title": "테스트 노드"
                }
            }],
            # 메시지 조회
            [
                {"m": {"id": "msg-1", "content": "메시지 1"}},
                {"m": {"id": "msg-2", "content": "메시지 2"}}
            ]
        ]
        
        result = await node_service.get_node_with_messages("node-123")
        
        assert result["id"] == "node-123"
        assert len(result["messages"]) == 2
        
    @pytest.mark.asyncio
    async def test_get_node_tree(self, node_service, mock_db):
        """노드 트리 조회 테스트"""
        # 재귀적 트리 구조 모의
        mock_db.execute_query.side_effect = [
            # 루트 노드
            [{"n": {"id": "main", "title": "메인"}}],
            # 루트의 자식들
            [
                {"n": {"id": "child-1", "title": "자식 1"}},
                {"n": {"id": "child-2", "title": "자식 2"}}
            ],
            # child-1의 자식들 (없음)
            [],
            # child-2의 자식들 (없음)
            []
        ]
        
        result = await node_service.get_node_tree("main")
        
        assert result["node"]["id"] == "main"
        assert len(result["children"]) == 2
        
    @pytest.mark.asyncio
    async def test_update_node(self, node_service, mock_db):
        """노드 업데이트 테스트"""
        mock_db.execute_write.return_value = True
        mock_db.execute_query.return_value = [{
            "n": {
                "id": "node-123",
                "title": "수정된 노드",
                "is_active": False
            }
        }]
        
        update_data = NodeUpdate(
            title="수정된 노드",
            is_active=False
        )
        result = await node_service.update_node("node-123", update_data)
        
        assert result["title"] == "수정된 노드"
        assert result["is_active"] is False
        
    @pytest.mark.asyncio
    async def test_delete_node(self, node_service, mock_db):
        """노드 삭제 테스트"""
        mock_db.execute_write.return_value = True
        
        result = await node_service.delete_node("node-123")
        
        assert result is True
        
    @pytest.mark.asyncio
    async def test_create_branch(self, node_service, mock_db):
        """브랜치 생성 테스트"""
        mock_db.execute_query.return_value = [{"depth": 1}]
        mock_db.execute_write.return_value = True
        
        branches = [
            {"title": "브랜치 1", "content": "내용 1"},
            {"title": "브랜치 2", "content": "내용 2"}
        ]
        
        with patch.object(node_service, 'create_node', new=AsyncMock()) as mock_create:
            mock_create.side_effect = [
                {"id": "branch-1", "title": "브랜치 1"},
                {"id": "branch-2", "title": "브랜치 2"}
            ]
            
            result = await node_service.create_branch("parent-123", branches)
            
            assert len(result) == 2
            assert result[0]["id"] == "branch-1"
            
    @pytest.mark.asyncio
    async def test_create_summary(self, node_service, mock_db):
        """요약 생성 테스트"""
        # 노드들 조회
        mock_db.execute_query.side_effect = [
            [
                {"n": {"id": "node-1", "content": "내용 1"}},
                {"n": {"id": "node-2", "content": "내용 2"}}
            ],
            [{
                "s": {
                    "id": "summary-123",
                    "title": "요약",
                    "is_summary": True
                }
            }]
        ]
        mock_db.execute_write.return_value = True
        
        with patch('backend.services.node_service.ChatService') as mock_chat:
            mock_chat_service = mock_chat.return_value
            mock_chat_service.generate_summary = AsyncMock(
                return_value="요약된 내용"
            )
            
            result = await node_service.create_summary(
                ["node-1", "node-2"],
                is_manual=False
            )
            
            assert result["is_summary"] is True