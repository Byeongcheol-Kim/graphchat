"""AI 서비스용 Pydantic 모델 정의"""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class BranchType(str, Enum):
    """브랜치 타입"""

    TOPICS = "topics"
    DETAILS = "details"
    ALTERNATIVES = "alternatives"
    QUESTIONS = "questions"
    EXAMPLES = "examples"


class Branch(BaseModel):
    """브랜치 정보 모델"""

    title: str = Field(description="브랜치 제목")
    type: BranchType = Field(description="브랜치 타입")
    description: str = Field(description="브랜치에 대한 설명")
    priority: float = Field(default=0.5, ge=0.0, le=1.0, description="브랜치 우선순위 (0.0-1.0)")
    estimated_depth: int = Field(default=3, ge=1, le=10, description="예상 대화 깊이")


class BranchAnalysis(BaseModel):
    """브랜치 분석 결과"""

    recommended_branches: list[Branch] = Field(
        default_factory=list, max_length=3, description="추천 브랜치 목록 (최대 3개)"
    )


class Message(BaseModel):
    """대화 메시지"""

    role: Literal["system", "user", "assistant"] = Field(description="메시지 역할")
    content: str = Field(description="메시지 내용")


class ChatRequest(BaseModel):
    """채팅 요청"""

    messages: list[Message] = Field(description="대화 메시지 목록")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="생성 온도")
    max_tokens: int | None = Field(default=None, ge=1, description="최대 토큰 수")
    stream: bool = Field(default=False, description="스트리밍 여부")


class ChatResponse(BaseModel):
    """채팅 응답"""

    content: str = Field(description="응답 내용")
    usage: dict | None = Field(default=None, description="토큰 사용량")
    finish_reason: str | None = Field(default=None, description="종료 이유")


class BranchingRequest(BaseModel):
    """브랜칭 분석 요청"""

    messages: list[Message] = Field(description="분석할 대화 메시지")
    temperature: float = Field(
        default=0.3, ge=0.0, le=1.0, description="분석 온도 (낮을수록 일관성)"
    )


class BranchingResponse(BaseModel):
    """브랜칭 분석 응답"""

    recommended_branches: list[Branch] = Field(
        default_factory=list, description="추천된 브랜치 목록"
    )
    analysis_confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="분석 신뢰도")


class ContextSummary(BaseModel):
    """컨텍스트 요약"""

    summary: str = Field(description="요약 내용")
    token_count: int = Field(description="토큰 수")
    key_points: list[str] = Field(default_factory=list, description="핵심 포인트")


class SmartBranchRecommendation(BaseModel):
    """스마트 브랜치 추천"""

    title: str = Field(description="브랜치 제목")
    type: BranchType = Field(description="브랜치 타입")
    description: str = Field(description="상세 설명")
    priority: float = Field(default=0.5, ge=0.0, le=1.0)
    estimated_depth: int = Field(default=3, ge=1, le=10)
    rationale: str | None = Field(default=None, description="추천 이유")
    prerequisites: list[str] = Field(default_factory=list, description="선행 조건")
    expected_outcomes: list[str] = Field(default_factory=list, description="예상 결과")
