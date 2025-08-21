"""Google Gemini AI 서비스 - 최신 google-genai 라이브러리 사용"""
import os
import json
import logging
from typing import List, Optional, AsyncGenerator
from google import genai
from google.genai import types

from backend.schemas.ai_models import (
    Message,
    ChatResponse,
    BranchAnalysis,
    BranchingResponse,
    Branch
)

logger = logging.getLogger(__name__)


class GeminiService:
    """Google Gemini AI 서비스 클래스"""
    
    def __init__(self, api_key: str = None, model: str = "gemini-2.0-flash-001"):
        """
        Gemini 서비스 초기화
        
        Args:
            api_key: Google API 키
            model: 사용할 모델 이름
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.model_name = model
        self.client = None
        self.mock_mode = False  # 명시적으로 초기화
        self._initialize_client()
    
    def _initialize_client(self):
        """Gemini 클라이언트 초기화"""
        try:
            if not self.api_key:
                logger.warning("Google API 키가 설정되지 않음. Mock 모드로 실행합니다.")
                self.mock_mode = True
                return
            
            # 최신 google-genai 클라이언트 초기화
            self.client = genai.Client(api_key=self.api_key)
            logger.info(f"Gemini 서비스 초기화 완료: {self.model_name}")
            self.mock_mode = False
        except Exception as e:
            logger.error(f"Gemini 초기화 실패: {e}")
            self.mock_mode = True
    
    async def chat_completion(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        structured: bool = False
    ) -> ChatResponse:
        """
        채팅 완성 생성 - 메시지 응답만 생성
        
        Args:
            messages: 대화 메시지 목록
            temperature: 생성 온도
            structured: 구조화된 응답 사용 여부 (더 이상 사용하지 않음)
        
        Returns:
            ChatResponse 모델
        """
        if self.mock_mode:
            return self._mock_completion()
        
        try:
            # 메시지 포맷팅
            contents = self._format_messages_to_contents(messages)
            system_instruction = self._extract_system_instruction(messages)
            
            # 디버그 로깅: LLM 입력
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"\n{'='*50}\n[Gemini API 호출 - 일반 대화]\n{'='*50}")
                logger.debug(f"모델: {self.model_name}")
                logger.debug(f"온도: {temperature}")
                logger.debug(f"시스템 인스트럭션: {system_instruction or '없음'}")
                logger.debug(f"입력 메시지 수: {len(messages)}개")
                for i, msg in enumerate(messages[-3:], 1):  # 최근 3개 메시지만 표시
                    logger.debug(f"  [{msg.role}]: {msg.content[:200]}{'...' if len(msg.content) > 200 else ''}")
            
            # GenerateContentConfig 생성
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=None,  # 제한 없음
                candidate_count=1
            )
            
            # 시스템 인스트럭션 추가
            if system_instruction:
                config.system_instruction = system_instruction
            
            # 비동기 응답 생성
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            # 디버그 로깅: LLM 출력
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"\n[Gemini 응답]\n{'-'*50}")
                logger.debug(f"응답 길이: {len(response.text)} 문자")
                logger.debug(f"응답 내용: {response.text[:500]}{'...' if len(response.text) > 500 else ''}")
                logger.debug(f"{'='*50}\n")
            
            return ChatResponse(
                content=response.text,
                finish_reason="stop"
            )
                
        except Exception as e:
            logger.error(f"Gemini API 호출 실패: {e}")
            return self._mock_completion()
    
    async def analyze_branching(
        self,
        messages: List[Message],
        temperature: float = 0.3
    ) -> BranchingResponse:
        """
        브랜칭 분석 - 대화를 분석하여 브랜치 추천
        
        Args:
            messages: 대화 메시지 목록
            temperature: 생성 온도 (낮을수록 일관된 결과)
        
        Returns:
            BranchingResponse 모델
        """
        if self.mock_mode:
            return self._mock_branching()
        
        try:
            # 브랜칭 분석을 위한 프롬프트
            conversation = self._format_messages_to_text(messages)
            prompt = f"""다음 대화를 분석하여 추가로 탐구할 만한 주제를 찾아주세요.

대화 내용:
{conversation}

분석 기준:
1. 사용자가 관심을 가질 만한 관련 주제
2. 더 깊이 탐구할 수 있는 세부사항
3. 대안적인 접근 방법
4. 추가 질문이 필요한 부분
5. 구체적인 예시가 도움이 될 부분

추천 브랜치는 정말 탐구할 가치가 있는 구체적 주제만 최대 3개까지 제안합니다.
단순한 대화나 명확한 답변이 이미 제공된 경우 빈 배열을 반환합니다."""
            
            # 디버그 로깅: 브랜칭 분석 입력
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"\n{'='*50}\n[Gemini API 호출 - 브랜칭 분석]\n{'='*50}")
                logger.debug(f"모델: {self.model_name}")
                logger.debug(f"온도: {temperature}")
                logger.debug(f"대화 메시지 수: {len(messages)}개")
                logger.debug(f"프롬프트 길이: {len(prompt)} 문자")
            
            # Pydantic 모델을 사용한 구조화된 응답
            config = types.GenerateContentConfig(
                temperature=temperature,
                candidate_count=1,
                response_mime_type='application/json',
                response_schema=BranchAnalysis  # Pydantic 모델 직접 전달
            )
            
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            
            # 디버그 로깅: 브랜칭 분석 출력
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"\n[Gemini 브랜칭 분석 응답]\n{'-'*50}")
                logger.debug(f"원본 응답: {response.text[:500]}{'...' if len(response.text) > 500 else ''}")
            
            # JSON 파싱 및 BranchingResponse 모델로 변환
            result = json.loads(response.text)
            
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"추천 브랜치 수: {len(result.get('recommended_branches', []))}개")
                for i, branch in enumerate(result.get('recommended_branches', [])[:3], 1):
                    logger.debug(f"  브랜치 {i}: {branch.get('title', 'N/A')}")
                logger.debug(f"{'='*50}\n")
            
            return BranchingResponse(**result)
            
        except Exception as e:
            logger.error(f"브랜칭 분석 실패: {e}")
            return BranchingResponse(recommended_branches=[])
    
    async def stream_chat_completion(
        self,
        messages: List[Message],
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """
        스트리밍 채팅 완성
        
        Args:
            messages: 대화 메시지 목록
            temperature: 생성 온도
        
        Yields:
            응답 텍스트 청크
        """
        if self.mock_mode:
            async for chunk in self._mock_stream(messages):
                yield chunk
            return
        
        try:
            # 메시지 포맷팅
            contents = self._format_messages_to_contents(messages)
            system_instruction = self._extract_system_instruction(messages)
            
            # GenerateContentConfig 생성
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=None,  # 제한 없음
                candidate_count=1
            )
            
            # 시스템 인스트럭션 추가
            if system_instruction:
                config.system_instruction = system_instruction
            
            # 비동기 스트리밍 응답
            async for chunk in await self.client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=contents,
                config=config
            ):
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            logger.error(f"Gemini 스트리밍 실패: {e}")
            async for chunk in self._mock_stream(messages):
                yield chunk
    
    def _extract_system_instruction(self, messages: List[Message]) -> Optional[str]:
        """시스템 메시지 추출"""
        for msg in messages:
            if msg.role == "system":
                return msg.content
        return None
    
    def _format_messages_to_contents(self, messages: List[Message]) -> str:
        """
        메시지 목록을 contents 문자열로 변환 (시스템 메시지 제외)
        """
        formatted = []
        
        for msg in messages:
            if msg.role == "system":
                continue  # 시스템 메시지는 system_instruction으로 처리
            elif msg.role == "assistant":
                formatted.append(f"Assistant: {msg.content}")
            else:  # user
                formatted.append(f"User: {msg.content}")
        
        # 마지막에 Assistant 응답을 유도
        formatted.append("Assistant:")
        
        return "\n\n".join(formatted)
    
    def _format_messages_to_text(self, messages: List[Message]) -> str:
        """
        메시지 목록을 텍스트로 변하 (분석용)
        """
        formatted = []
        
        for msg in messages:
            if msg.role == "system":
                continue
            elif msg.role == "assistant":
                formatted.append(f"AI: {msg.content}")
            else:  # user
                formatted.append(f"사용자: {msg.content}")
        
        return "\n".join(formatted)
    
    def _mock_completion(self) -> ChatResponse:
        """모의 채팅 응답 생성"""
        return ChatResponse(
            content="이것은 Gemini 모의 응답입니다.",
            finish_reason="stop"
        )
    
    def _mock_branching(self) -> BranchingResponse:
        """모의 브랜칭 분석 결과"""
        from backend.schemas.ai_models import BranchType
        return BranchingResponse(
            recommended_branches=[
                Branch(
                    title="모의 브랜치",
                    type=BranchType.TOPICS,
                    description="테스트용 브랜치",
                    priority=0.8
                )
            ],
            analysis_confidence=0.9
        )
    
    async def _mock_stream(self, messages: List[Message]) -> AsyncGenerator[str, None]:
        """모의 스트리밍 응답"""
        mock_text = "이것은 Gemini 모의 스트리밍 응답입니다. "
        for char in mock_text:
            yield char