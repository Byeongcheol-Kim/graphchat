"""
services/session_service.py 테스트
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from backend.services.session_service import SessionService
from backend.schemas.session import SessionCreate, SessionUpdate


@pytest.fixture
def mock_db():
    """모의 데이터베이스 fixture"""
    db = Mock()
    db.execute_query = AsyncMock()
    db.execute_write = AsyncMock()
    return db


@pytest.fixture
def session_service(mock_db):
    """SessionService fixture"""
    return SessionService(mock_db)


class TestSessionService:
    """SessionService 테스트"""
    
    @pytest.mark.asyncio
    async def test_create_session(self, session_service, mock_db):
        """세션 생성 테스트"""
        mock_db.execute_write.return_value = True
        mock_db.execute_query.return_value = [{
            "s": {
                "id": "session-123",
                "title": "새 세션",
                "user_id": "user-123",
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "node_count": 0
            }
        }]
        
        session_data = SessionCreate(title="새 세션", user_id="user-123")
        result = await session_service.create_session(session_data)
        
        assert result["id"] == "session-123"
        assert result["title"] == "새 세션"
        mock_db.execute_write.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_get_session(self, session_service, mock_db):
        """세션 조회 테스트"""
        mock_db.execute_query.return_value = [{
            "s": {
                "id": "session-123",
                "title": "테스트 세션",
                "user_id": "user-123",
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "node_count": 5
            }
        }]
        
        result = await session_service.get_session("session-123")
        
        assert result["id"] == "session-123"
        assert result["node_count"] == 5
        
    @pytest.mark.asyncio
    async def test_get_session_not_found(self, session_service, mock_db):
        """존재하지 않는 세션 조회 테스트"""
        mock_db.execute_query.return_value = []
        
        result = await session_service.get_session("nonexistent")
        
        assert result is None
        
    @pytest.mark.asyncio
    async def test_list_sessions(self, session_service, mock_db):
        """세션 목록 조회 테스트"""
        mock_db.execute_query.return_value = [
            {"s": {"id": "session-1", "title": "세션 1"}},
            {"s": {"id": "session-2", "title": "세션 2"}}
        ]
        
        result = await session_service.list_sessions(user_id="user-123")
        
        assert len(result) == 2
        assert result[0]["id"] == "session-1"
        
    @pytest.mark.asyncio
    async def test_list_sessions_with_limit(self, session_service, mock_db):
        """제한된 세션 목록 조회 테스트"""
        mock_db.execute_query.return_value = [
            {"s": {"id": "session-1", "title": "세션 1"}}
        ]
        
        result = await session_service.list_sessions(user_id="user-123", limit=1)
        
        assert len(result) == 1
        
    @pytest.mark.asyncio
    async def test_update_session(self, session_service, mock_db):
        """세션 업데이트 테스트"""
        mock_db.execute_write.return_value = True
        mock_db.execute_query.return_value = [{
            "s": {
                "id": "session-123",
                "title": "수정된 세션",
                "updated_at": datetime.now()
            }
        }]
        
        update_data = SessionUpdate(title="수정된 세션")
        result = await session_service.update_session("session-123", update_data)
        
        assert result["title"] == "수정된 세션"
        
    @pytest.mark.asyncio
    async def test_delete_session(self, session_service, mock_db):
        """세션 삭제 테스트"""
        mock_db.execute_write.return_value = True
        
        result = await session_service.delete_session("session-123")
        
        assert result is True
        mock_db.execute_write.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_delete_session_not_found(self, session_service, mock_db):
        """존재하지 않는 세션 삭제 테스트"""
        mock_db.execute_write.return_value = False
        
        result = await session_service.delete_session("nonexistent")
        
        assert result is False
        
    @pytest.mark.asyncio
    async def test_get_session_with_nodes(self, session_service, mock_db):
        """노드 포함 세션 조회 테스트"""
        mock_db.execute_query.side_effect = [
            # 첫 번째 쿼리: 세션 정보
            [{
                "s": {
                    "id": "session-123",
                    "title": "테스트 세션"
                }
            }],
            # 두 번째 쿼리: 노드 정보
            [
                {"n": {"id": "node-1", "title": "노드 1"}},
                {"n": {"id": "node-2", "title": "노드 2"}}
            ]
        ]
        
        result = await session_service.get_session_with_nodes("session-123")
        
        assert result["id"] == "session-123"
        assert len(result["nodes"]) == 2