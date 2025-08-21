"""
서비스 응답 모델들
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .message import Message
from .node import Node


class TokenUsage(BaseModel):
    """토큰 사용량"""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class BranchRecommendation(BaseModel):
    """브랜치 추천 정보"""

    title: str = Field(..., description="브랜치 제목")
    type: str = Field(default="branch", description="브랜치 타입")
    description: str = Field(default="", description="브랜치 설명")
    priority: float = Field(default=0.5, ge=0, le=1, description="우선순위 (0-1)")
    estimated_depth: int = Field(default=3, ge=1, description="예상 깊이")
    edge_label: str = Field(..., description="엣지 라벨")


class ChatProcessResult(BaseModel):
    """채팅 처리 결과"""

    response: str = Field(..., description="AI 응답")
    node_id: str = Field(..., description="노드 ID")
    new_nodes: list[Node] = Field(default_factory=list, description="생성된 새 노드들")
    branched: bool = Field(default=False, description="브랜치 생성 여부")
    token_usage: TokenUsage = Field(default_factory=TokenUsage, description="토큰 사용량")
    message_id: str | None = Field(None, description="메시지 ID")
    recommended_branches: list[BranchRecommendation] = Field(
        default_factory=list, description="추천 브랜치들"
    )


class ConversationHistory(BaseModel):
    """대화 히스토리"""

    messages: list[Message] = Field(..., description="메시지 목록")
    total_tokens: int = Field(default=0, description="총 토큰 수")
    is_summarized: bool = Field(default=False, description="요약 여부")


class SummaryResult(BaseModel):
    """요약 결과"""

    summary: str = Field(..., description="요약 내용")
    title: str = Field(..., description="요약 제목 (20자 이내)")
    original_message_count: int = Field(..., description="원본 메시지 수")
    token_count: int = Field(default=0, description="요약의 토큰 수")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="생성 시간")


class ContextLimitResult(BaseModel):
    """컨텍스트 한계 확인 결과"""

    is_near_limit: bool = Field(..., description="한계 근접 여부")
    token_count: int = Field(..., description="현재 토큰 수")
    summary: str | None = Field(None, description="생성된 요약 (있는 경우)")


class NodeStatistics(BaseModel):
    """노드 통계 정보"""

    message_count: int = Field(default=0, description="메시지 수")
    token_count: int = Field(default=0, description="토큰 수")
    has_summary: bool = Field(default=False, description="요약 존재 여부")
    last_updated: datetime | None = Field(None, description="마지막 업데이트")


class SessionStatistics(BaseModel):
    """세션 통계 정보"""

    total_nodes: int = Field(default=0, description="전체 노드 수")
    total_messages: int = Field(default=0, description="전체 메시지 수")
    total_tokens: int = Field(default=0, description="전체 토큰 수")
    active_nodes: int = Field(default=0, description="활성 노드 수")
    last_activity: datetime | None = Field(None, description="마지막 활동 시간")


class SessionWithStatistics(BaseModel):
    """통계를 포함한 세션 정보"""

    id: str
    title: str
    user_id: str | None = None
    root_node_id: str
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
    statistics: SessionStatistics = Field(default_factory=SessionStatistics)
    nodes: list[Node] | None = None


class PaginatedResult(BaseModel):
    """페이지네이션 결과"""

    items: list[Any] = Field(..., description="항목 목록")
    total: int = Field(..., description="전체 항목 수")
    page: int = Field(default=1, description="현재 페이지")
    size: int = Field(default=10, description="페이지 크기")
    has_next: bool = Field(default=False, description="다음 페이지 존재 여부")
    has_prev: bool = Field(default=False, description="이전 페이지 존재 여부")


class PaginatedSessions(PaginatedResult):
    """페이지네이션된 세션 목록"""

    items: list[SessionWithStatistics] = Field(..., description="세션 목록")


class OperationResult(BaseModel):
    """작업 결과"""

    success: bool = Field(..., description="성공 여부")
    message: str = Field(default="", description="결과 메시지")
    data: dict[str, Any] | None = Field(None, description="추가 데이터")
    error_code: str | None = Field(None, description="에러 코드")


class DeleteNodesResult(BaseModel):
    """노드 삭제 결과"""

    success: bool = Field(..., description="전체 성공 여부")
    deleted_count: int = Field(default=0, description="삭제된 노드 수")
    deleted_node_ids: list[str] = Field(default_factory=list, description="삭제된 노드 ID 목록")
    deleted_with_descendants: dict[str, list[str]] = Field(
        default_factory=dict, description="각 노드별 삭제된 하위 노드 ID"
    )
    failed_node_ids: list[str] = Field(default_factory=list, description="삭제 실패한 노드 ID")
    message: str | None = Field(None, description="결과 메시지")
