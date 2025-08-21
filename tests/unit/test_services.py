"""
서비스 클래스 단위 테스트
"""
import pytest
from backend.db.falkordb import FalkorDBManager
from backend.services.openrouter_service import OpenRouterService
from backend.services.chat_service import ChatService


class TestFalkorDBManager:
    """FalkorDBManager 단위 테스트"""
    
    def test_init_with_defaults(self):
        """기본값으로 초기화 테스트"""
        db = FalkorDBManager()
        assert db.host == "localhost"
        assert db.port == 6379
        assert db.graph_name == "branching_ai"
        assert db.redis_host == "localhost"
        assert db.redis_port == 6380
        assert db.redis_db == 0
    
    def test_init_with_custom_values(self):
        """커스텀 값으로 초기화 테스트"""
        db = FalkorDBManager(
            host="custom-host",
            port=1234,
            graph_name="custom_graph",
            redis_host="redis-host",
            redis_port=5678,
            redis_db=2
        )
        assert db.host == "custom-host"
        assert db.port == 1234
        assert db.graph_name == "custom_graph"
        assert db.redis_host == "redis-host"
        assert db.redis_port == 5678
        assert db.redis_db == 2


class TestOpenRouterService:
    """OpenRouterService 단위 테스트"""
    
    def test_init_with_defaults(self):
        """기본값으로 초기화 테스트"""
        service = OpenRouterService()
        assert service.api_key is None
        assert service.base_url == "https://openrouter.ai/api/v1"
        assert service.site_url == "http://localhost:3000"
        assert service.site_name == "Branching AI"
        assert service.default_model == "deepseek/deepseek-r1:free"
    
    def test_init_with_custom_values(self):
        """커스텀 값으로 초기화 테스트"""
        service = OpenRouterService(
            api_key="test-key",
            model="custom-model",
            site_url="https://example.com",
            site_name="Test Site"
        )
        assert service.api_key == "test-key"
        assert service.default_model == "custom-model"
        assert service.site_url == "https://example.com"
        assert service.site_name == "Test Site"
    
    def test_mock_response(self):
        """모의 응답 테스트"""
        service = OpenRouterService()
        response = service._mock_response([{"role": "user", "content": "test"}])
        
        assert response["id"] == "mock-response"
        assert response["model"] == "mock-model"
        assert "choices" in response
        assert len(response["choices"]) == 1
        assert response["choices"][0]["message"]["role"] == "assistant"
        assert "모의 응답" in response["choices"][0]["message"]["content"]


class TestChatService:
    """ChatService 단위 테스트"""
    
    def test_init_with_defaults(self, mock_db_manager):
        """기본값으로 초기화 테스트"""
        service = ChatService(db=mock_db_manager)
        assert service.db == mock_db_manager
        assert service.message_service is not None
        assert service.node_service is not None
        assert service.gemini is not None
        assert service.branching_service is not None
    
    def test_init_with_custom_values(self, mock_db_manager):
        """커스텀 값으로 초기화 테스트"""
        service = ChatService(
            db=mock_db_manager,
            google_api_key="test-api-key",
            gemini_model="test-model"
        )
        assert service.db == mock_db_manager
        assert service.gemini.api_key == "test-api-key"
        assert service.gemini.model_name == "test-model"
    
    def test_prepare_messages(self, mock_db_manager):
        """메시지 준비 테스트"""
        service = ChatService(db=mock_db_manager)
        history = [
            {"role": "user", "content": "안녕하세요"},
            {"role": "assistant", "content": "안녕하세요! 무엇을 도와드릴까요?"}
        ]
        
        messages = service._prepare_messages(history)
        
        # 시스템 메시지 포함 확인
        assert len(messages) == 3
        assert messages[0].role == "system"
        assert messages[1].role == "user"
        assert messages[1].content == "안녕하세요"
        assert messages[2].role == "assistant"
        assert messages[2].content == "안녕하세요! 무엇을 도와드릴까요?"