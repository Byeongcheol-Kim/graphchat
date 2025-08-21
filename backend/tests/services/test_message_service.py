"""
services/message_service.py 테스트
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, AsyncMock
from backend.services.message_service import MessageService
from backend.schemas.message import MessageCreate, Message


@pytest.fixture
def mock_db():
    """모의 데이터베이스 fixture"""
    db = Mock()
    db.execute_query = AsyncMock(return_value=[])
    db.execute_write = AsyncMock(return_value=True)
    return db


@pytest.fixture
def message_service(mock_db):
    """MessageService fixture"""
    return MessageService(mock_db)


class TestMessageService:
    """MessageService 테스트"""
    
    @pytest.mark.asyncio
    async def test_create_message(self, message_service, mock_db):
        """메시지 생성 테스트"""
        # Given: DB가 생성된 메시지를 반환하도록 설정
        created_time = datetime.now()
        mock_db.execute_query.return_value = [{
            "m": {
                "id": "msg-123",
                "node_id": "node-123",
                "role": "user",
                "content": "테스트 메시지",
                "timestamp": created_time,
                "embedding": None
            }
        }]
        
        message_data = MessageCreate(
            node_id="node-123",
            role="user",
            content="테스트 메시지"
        )
        
        # When: 메시지 생성
        result = await message_service.create_message(message_data)
        
        # Then: 메시지 딕셔너리가 반환됨
        assert isinstance(result, dict)
        assert result["id"] == "msg-123"
        assert result["content"] == "테스트 메시지"
        assert result["role"] == "user"
        mock_db.execute_query.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_create_message_with_embedding(self, message_service, mock_db):
        """임베딩 포함 메시지 생성 테스트"""
        # Given: 메시지 생성 후 임베딩 업데이트
        embedding = [0.1, 0.2, 0.3]
        mock_db.execute_query.return_value = [{
            "m": {
                "id": "msg-123",
                "node_id": "node-123",
                "role": "user",
                "content": "테스트",
                "timestamp": datetime.now(),
                "embedding": None
            }
        }]
        
        message_data = MessageCreate(
            node_id="node-123",
            role="user",
            content="테스트"
        )
        
        # When: 메시지 생성 (create_message는 embedding을 받지 않음)
        result = await message_service.create_message(message_data)
        
        # Then: 메시지 딕셔너리 반환
        assert isinstance(result, dict)
        assert result["embedding"] is None  # 처음에는 embedding이 없음
            
    @pytest.mark.asyncio
    async def test_get_message(self, message_service, mock_db):
        """메시지 조회 테스트"""
        # Given: DB가 메시지를 반환하도록 설정
        mock_db.execute_query.return_value = [{
            "m": {
                "id": "msg-123",
                "node_id": "node-123",
                "role": "assistant",
                "content": "AI 응답",
                "timestamp": datetime.now(),
                "embedding": None
            }
        }]
        
        # When: 메시지 조회
        result = await message_service.get_message("msg-123")
        
        # Then: 메시지 딕셔너리 반환
        assert isinstance(result, dict)
        assert result["id"] == "msg-123"
        assert result["role"] == "assistant"
        assert result["content"] == "AI 응답"
        
    @pytest.mark.asyncio
    async def test_get_message_not_found(self, message_service, mock_db):
        """존재하지 않는 메시지 조회 테스트"""
        mock_db.execute_query.return_value = []
        
        result = await message_service.get_message("nonexistent")
        
        assert result is None
        
    @pytest.mark.asyncio
    async def test_get_messages_by_node(self, message_service, mock_db):
        """노드별 메시지 목록 조회 테스트"""
        # Given: 여러 메시지 반환 설정
        mock_db.execute_query.return_value = [
            {"m": {
                "id": "msg-1",
                "node_id": "node-123",
                "role": "user",
                "content": "메시지 1",
                "timestamp": datetime.now(),
                "embedding": None
            }},
            {"m": {
                "id": "msg-2",
                "node_id": "node-123",
                "role": "assistant",
                "content": "메시지 2",
                "timestamp": datetime.now(),
                "embedding": None
            }}
        ]
        
        # When: 노드별 메시지 조회
        result = await message_service.get_messages_by_node("node-123")
        
        # Then: 메시지 딕셔너리 리스트 반환
        assert len(result) == 2
        assert all(isinstance(msg, dict) for msg in result)
        assert result[0]["id"] == "msg-1"
        assert result[1]["id"] == "msg-2"
        
    @pytest.mark.asyncio
    async def test_get_messages_with_limit(self, message_service, mock_db):
        """제한된 메시지 목록 조회 테스트"""
        # Given: 하나의 메시지만 반환
        mock_db.execute_query.return_value = [
            {"m": {
                "id": "msg-1",
                "node_id": "node-123",
                "role": "user",
                "content": "메시지 1",
                "timestamp": datetime.now(),
                "embedding": None
            }}
        ]
        
        # When: 제한을 두고 메시지 조회 (list_messages 사용)
        result = await message_service.list_messages(node_id="node-123", limit=1)
        
        # Then: 제한된 수의 메시지 반환
        assert len(result) == 1
        assert result[0]["id"] == "msg-1"
        
    @pytest.mark.asyncio
    async def test_delete_message(self, message_service, mock_db):
        """메시지 삭제 테스트"""
        # Given: 메시지 삭제는 execute_write 사용
        # 성공적으로 삭제되면 True 반환
        
        # When: 메시지 삭제
        result = await message_service.delete_message("msg-123")
        
        # Then: 삭제 성공
        assert result is True
        mock_db.execute_write.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_delete_message_not_found(self, message_service, mock_db):
        """예외 발생 시 메시지 삭제 테스트"""
        # Given: execute_write가 예외 발생
        mock_db.execute_write.side_effect = Exception("Delete failed")
        
        # When: 메시지 삭제 시도
        result = await message_service.delete_message("nonexistent")
        
        # Then: 삭제 실패
        assert result is False
        
    @pytest.mark.asyncio
    async def test_get_conversation_history(self, message_service, mock_db):
        """대화 기록 조회 테스트"""
        # Given: 대화 이력과 부모 노드 조회 설정
        # 첫 번째 호출 - 메시지 목록
        messages_result = [
            {
                "m": {
                    "id": "msg-1",
                    "node_id": "node-123",
                    "role": "user",
                    "content": "질문",
                    "timestamp": datetime.now(),
                    "embedding": None
                }
            },
            {
                "m": {
                    "id": "msg-2",
                    "node_id": "node-123",
                    "role": "assistant",
                    "content": "답변",
                    "timestamp": datetime.now(),
                    "embedding": None
                }
            }
        ]
        
        # list_messages는 딕셔너리 리스트를 반환
        # get_conversation_history는 list_messages를 호출
        mock_db.execute_query.side_effect = [
            messages_result,  # list_messages 호출 결과
            []  # 부모 노드 조회 결과 (부모 없음)
        ]
        
        # When: 대화 이력 조회
        result = await message_service.get_conversation_history("node-123")
        
        # Then: 대화 이력 딕셔너리 리스트 반환 (list_messages가 m을 추출해서 반환)
        assert len(result) == 2
        assert all(isinstance(msg, dict) for msg in result)
        assert result[0]["id"] == "msg-1"
        assert result[0]["role"] == "user"
        assert result[1]["id"] == "msg-2"
        assert result[1]["role"] == "assistant"
        
    @pytest.mark.asyncio
    async def test_update_message_embedding(self, message_service, mock_db):
        """메시지 임베딩 업데이트 테스트"""
        # Given: 업데이트 성공 설정
        new_embedding = [0.1, 0.2, 0.3]
        mock_db.execute_query.return_value = [{
            "m": {
                "id": "msg-123",
                "node_id": "node-123",
                "role": "user",
                "content": "테스트",
                "timestamp": datetime.now(),
                "embedding": new_embedding
            }
        }]
        
        # When: 임베딩 업데이트
        result = await message_service.update_message_embedding("msg-123", new_embedding)
        
        # Then: 업데이트 성공 (bool 반환)
        assert result is True