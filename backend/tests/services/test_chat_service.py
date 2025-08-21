"""
services/chat_service.py 테스트
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from backend.services.chat_service import ChatService
from backend.schemas.message import ChatRequest, ChatResponse as MessageChatResponse
from backend.schemas.ai_models import ChatResponse, BranchType, BranchingResponse, Branch, BranchAnalysis


@pytest.fixture
def mock_db():
    """모의 데이터베이스 fixture"""
    db = Mock()
    db.execute_query = AsyncMock(return_value=[])
    db.execute_write = AsyncMock(return_value=True)
    return db


@pytest.fixture
def mock_gemini_service():
    """모의 Gemini 서비스 fixture"""
    service = Mock()
    service.chat_completion = AsyncMock()
    service.analyze_branching = AsyncMock()
    service.generate_summary = AsyncMock()
    service.stream_chat = AsyncMock()
    return service


@pytest.fixture
def mock_message_service():
    """모의 메시지 서비스 fixture"""
    service = Mock()
    service.create_message = AsyncMock()
    service.get_messages_by_node = AsyncMock(return_value=[])
    service.delete_message = AsyncMock()
    return service


@pytest.fixture
def mock_node_service():
    """모의 노드 서비스 fixture"""
    service = Mock()
    service.create_node = AsyncMock()
    service.get_node = AsyncMock()
    service.update_node = AsyncMock()
    service.delete_node = AsyncMock()
    return service


@pytest.fixture
def mock_branching_service():
    """모의 브랜칭 서비스 fixture"""
    service = Mock()
    service.detect_branches = AsyncMock()
    service.create_branch_nodes = AsyncMock()
    service.analyze_content = AsyncMock()
    return service


@pytest.fixture  
def chat_service(mock_db):
    """ChatService fixture with mocked dependencies"""
    # Mock 서비스 생성 시 직접 주입하지 않고 patch를 사용
    with patch('backend.services.chat_service.GeminiService') as MockGemini, \
         patch('backend.services.chat_service.MessageService') as MockMessage, \
         patch('backend.services.chat_service.NodeService') as MockNode, \
         patch('backend.services.chat_service.BranchingService') as MockBranching:
        
        # Mock 인스턴스 생성
        mock_gemini = Mock()
        mock_gemini.chat_completion = AsyncMock()
        mock_gemini.analyze_branching = AsyncMock()
        mock_gemini.generate_summary = AsyncMock()
        mock_gemini.stream_chat = AsyncMock()
        MockGemini.return_value = mock_gemini
        
        mock_message = Mock()
        mock_message.create_message = AsyncMock()
        mock_message.get_messages_by_node = AsyncMock(return_value=[])
        mock_message.get_conversation_history = AsyncMock(return_value=[])
        mock_message.delete_message = AsyncMock()
        mock_message.update_message_embedding = AsyncMock()
        mock_message.search_messages = AsyncMock(return_value=[])
        MockMessage.return_value = mock_message
        
        mock_node = Mock()
        mock_node.create_node = AsyncMock()
        mock_node.get_node = AsyncMock()
        mock_node.update_node = AsyncMock()
        mock_node.delete_node = AsyncMock()
        MockNode.return_value = mock_node
        
        mock_branching = Mock()
        mock_branching.detect_branches = AsyncMock()
        mock_branching.create_branch_nodes = AsyncMock()
        mock_branching.analyze_content = AsyncMock()
        mock_branching.check_context_limit = AsyncMock(return_value=(False, 1000, None))
        mock_branching.create_smart_branches = AsyncMock()
        MockBranching.return_value = mock_branching
        
        service = ChatService(
            db=mock_db,
            google_api_key="test-api-key",
            gemini_model="gemini-2.0-flash-exp"
        )
        
        # 생성된 mock 인스턴스를 속성으로 추가
        service._mock_gemini = mock_gemini
        service._mock_message = mock_message
        service._mock_node = mock_node
        service._mock_branching = mock_branching
        
        return service


class TestChatService:
    """ChatService 테스트"""
    
    @pytest.mark.asyncio
    async def test_process_chat_simple(self, chat_service):
        """단순 채팅 처리 테스트"""
        # Given: Gemini 서비스가 응답을 반환하도록 설정
        mock_response = ChatResponse(content="AI 응답입니다", finish_reason="stop")
        chat_service._mock_gemini.chat_completion.return_value = mock_response
        
        request = ChatRequest(
            session_id="session-123",
            node_id="node-123",
            message="안녕하세요",
            auto_branch=False
        )
        
        # When: 채팅 처리 실행
        result = await chat_service.process_chat(request=request)
        
        # Then: 올바른 응답 반환 확인
        assert result["response"] == "AI 응답입니다"
        assert result["branched"] is False
        assert result["new_nodes"] == []
        
        # 메시지 서비스가 호출되었는지 확인
        assert chat_service._mock_message.create_message.call_count == 2  # 사용자 메시지 + AI 응답
    
    @pytest.mark.asyncio
    async def test_process_chat_with_branching(self, chat_service):
        """분기 포함 채팅 처리 테스트"""
        # Given: Gemini 응답 설정
        mock_response = ChatResponse(content="복잡한 주제입니다", finish_reason="stop")
        chat_service._mock_gemini.chat_completion.return_value = mock_response
        
        # 브랜칭 분석 결과 설정
        mock_branches = [
            Branch(title="주제1", type=BranchType.TOPICS, description="첫 번째 주제"),
            Branch(title="주제2", type=BranchType.TOPICS, description="두 번째 주제")
        ]
        # analyze_branching은 BranchAnalysis를 반환해야 함
        mock_branch_analysis = BranchAnalysis(recommended_branches=mock_branches)
        chat_service._mock_gemini.analyze_branching.return_value = mock_branch_analysis
        
        # check_context_limit 모킹
        chat_service._mock_branching.check_context_limit.return_value = (False, 1000, None)
        
        request = ChatRequest(
            session_id="session-123",
            node_id="node-123",
            message="여러 주제를 다루는 질문",
            auto_branch=True
        )
        
        # When: 채팅 처리 실행
        result = await chat_service.process_chat(request=request)
        
        # Then: 브랜치 추천만 되고 자동 생성되지 않음 확인
        assert result["branched"] is False  # 자동 생성되지 않음
        assert len(result["new_nodes"]) == 0  # 새 노드 없음
        assert len(result["recommended_branches"]) == 2  # 추천은 됨
        assert result["recommended_branches"][0]["title"] == "주제1"
        assert result["recommended_branches"][1]["title"] == "주제2"
    
    @pytest.mark.asyncio
    async def test_generate_summary(self, chat_service):
        """요약 생성 테스트"""
        # Given: Gemini chat_completion 응답 설정 (generate_summary는 내부적으로 chat_completion 사용)
        mock_response = ChatResponse(content="요약된 내용입니다", finish_reason="stop")
        chat_service._mock_gemini.chat_completion.return_value = mock_response
        
        contents = ["내용 1", "내용 2", "내용 3"]
        
        # When: 요약 생성
        result = await chat_service.generate_summary(contents)
        
        # Then: 올바른 요약 반환
        assert result == "요약된 내용입니다"
    
    @pytest.mark.asyncio
    async def test_detect_branches(self, chat_service):
        """브랜치 감지 테스트"""
        # Given: 브랜치 감지 결과 설정
        mock_branches = [
            Branch(title="주제 A", type=BranchType.TOPICS, description="설명 A"),
            Branch(title="주제 B", type=BranchType.TOPICS, description="설명 B")
        ]
        chat_service._mock_branching.detect_branches.return_value = mock_branches
        
        # When: 브랜치 감지 실행
        result = await chat_service.branching_service.detect_branches(
            "복잡한 질문",
            "복잡한 답변"
        )
        
        # Then: 올바른 브랜치 반환
        assert len(result) == 2
        assert result[0].title == "주제 A"
        assert result[1].title == "주제 B"
    
    @pytest.mark.asyncio
    async def test_detect_branches_none(self, chat_service):
        """브랜치가 없는 경우 테스트"""
        # Given: 브랜치가 없는 경우
        chat_service._mock_branching.detect_branches.return_value = []
        
        # When: 브랜치 감지 실행
        result = await chat_service.branching_service.detect_branches(
            "단순한 질문",
            "단순한 답변"
        )
        
        # Then: 빈 리스트 반환
        assert result == []
    
    @pytest.mark.asyncio
    async def test_stream_chat(self, chat_service):
        """스트리밍 채팅 테스트"""
        # Given: 스트리밍 응답 설정
        async def mock_stream(*args, **kwargs):
            chunks = ["안녕", "하세요", ". ", "반갑습니다."]
            for chunk in chunks:
                yield chunk
        
        chat_service._mock_gemini.stream_chat_completion = mock_stream
        
        messages = [
            {"role": "user", "content": "안녕하세요"}
        ]
        
        # When: 스트리밍 채팅 실행
        chunks = []
        async for chunk in chat_service.stream_chat(messages):
            chunks.append(chunk)
        
        # Then: 올바른 청크 반환
        assert len(chunks) == 4
        assert "".join(chunks) == "안녕하세요. 반갑습니다."
    
    @pytest.mark.asyncio
    async def test_process_chat_error_handling(self, chat_service):
        """채팅 처리 오류 처리 테스트"""
        # Given: API 오류 설정
        chat_service._mock_gemini.chat_completion.side_effect = Exception("API Error")
        
        request = ChatRequest(
            session_id="session-123",
            node_id="node-123",
            message="테스트",
            auto_branch=False
        )
        
        # When: 오류 발생 시 처리
        result = await chat_service.process_chat(request=request)
        
        # Then: 예외 대신 오류 메시지 반환 확인
        assert result["response"] == "죄송합니다. 응답 생성 중 오류가 발생했습니다."
        assert result["branched"] is False
        assert result["new_nodes"] == []
    
    @pytest.mark.asyncio
    async def test_process_chat_with_empty_message(self, chat_service):
        """빈 메시지 처리 테스트"""
        # Given: MessageCreate validation error로 인해 예외 처리됨
        request = ChatRequest(
            session_id="session-123",
            node_id="node-123",
            message="",  # 빈 메시지는 validation 오류 발생
            auto_branch=False
        )
        
        # When: 빈 메시지로 채팅 처리
        result = await chat_service.process_chat(request=request)
        
        # Then: 오류 메시지 반환 (MessageCreate validation error)
        assert result["response"] == "죄송합니다. 응답 생성 중 오류가 발생했습니다."
        assert result["branched"] is False
    
    @pytest.mark.asyncio
    async def test_process_chat_with_long_message(self, chat_service):
        """긴 메시지 처리 테스트"""
        # Given: 긴 메시지 응답
        long_response = "A" * 10000
        mock_response = ChatResponse(content=long_response, finish_reason="stop")
        chat_service._mock_gemini.chat_completion.return_value = mock_response
        
        request = ChatRequest(
            session_id="session-123",
            node_id="node-123",
            message="B" * 5000,
            auto_branch=False
        )
        
        # When: 긴 메시지 처리
        result = await chat_service.process_chat(request=request)
        
        # Then: 전체 응답 반환
        assert result["response"] == long_response
        assert len(result["response"]) == 10000