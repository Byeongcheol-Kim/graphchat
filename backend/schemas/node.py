"""
노드 관련 Pydantic 스키마
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.schemas.message import Message

NodeType = Literal[
    "root", "main", "topic", "exploration", "question", "solution", "summary", "reference"
]


class NodeMetadata(BaseModel):
    """노드 메타데이터 스키마"""

    branch_type: str | None = None  # topics, details, alternatives, questions, examples
    priority: float | None = None  # 0.0 ~ 1.0
    estimated_depth: int | None = None  # 예상 깊이
    auto_generated: bool | None = False  # 자동 생성 여부
    created_by: str | None = None  # 생성자 (user, system, ai)
    tags: list[str] | None = Field(default_factory=list)  # 태그 목록
    custom_data: dict[str, Any] | None = Field(default_factory=dict)  # 사용자 정의 데이터

    class Config:
        extra = "allow"  # 추가 필드 허용


class NodeBase(BaseModel):
    """노드 기본 스키마"""

    title: str = Field(..., min_length=1, max_length=200)
    type: NodeType
    metadata: dict[str, Any] | None = Field(default_factory=dict)  # NodeMetadata로 변환 가능


class NodeCreate(NodeBase):
    """노드 생성 스키마"""

    session_id: str | None = None  # 엔드포인트에서 설정 가능
    parent_id: str | None = None
    content: str | None = None
    is_summary: bool = False
    summary_content: str | None = None


class NodeUpdate(BaseModel):
    """노드 수정 스키마"""

    title: str | None = Field(None, min_length=1, max_length=200)
    is_active: bool | None = None
    metadata: dict[str, Any] | None = None


class Node(NodeBase):
    """노드 응답 스키마"""

    id: str
    session_id: str
    parent_id: str | None = None
    content: str | None = None  # 노드 내용
    source_node_ids: list[str] | None = None  # 요약 노드의 소스 노드들
    is_summary: bool = False
    is_generating: bool = False  # 생성 중 상태 (요약 생성 중 등)
    summary_content: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    message_count: int = 0  # 노드의 메시지 개수
    token_count: int = 0
    depth: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class NodeWithMessages(Node):
    """메시지를 포함한 노드 스키마"""

    messages: list[Message] = []


class NodeTree(BaseModel):
    """노드 트리 스키마"""

    node: Node
    children: list[NodeTree] = []

    class Config:
        from_attributes = True


class SummaryRequest(BaseModel):
    """요약 생성 요청 스키마"""

    node_ids: list[str] = Field(..., min_items=1)
    is_manual: bool = False
    summary_content: str | None = None  # 수동 요약일 경우


class BranchItem(BaseModel):
    """브랜치 아이템 스키마"""

    title: str
    content: str | None = None
    type: NodeType = "solution"
    metadata: dict[str, Any] | None = Field(default_factory=dict)


class BranchRequest(BaseModel):
    """브랜치 생성 요청 스키마"""

    parent_id: str
    branches: list[BranchItem]


class ReferenceNodeRequest(BaseModel):
    """참조 노드 생성 요청 스키마"""

    node_ids: list[str] = Field(..., min_items=1)
    title: str | None = None
    content: str | None = None


class DeleteNodesResult(BaseModel):
    """노드 삭제 결과 스키마"""

    success: bool
    deleted_count: int = 0
    deleted_node_ids: list[str] = Field(default_factory=list)
    message: str | None = None


class NodeDeletionRequest(BaseModel):
    """노드 삭제 요청 스키마"""

    node_ids: list[str] = Field(..., min_items=1)
    include_descendants: bool = True


class NodeRelations(BaseModel):
    """노드 관계 정보 스키마"""

    current: Node | None = None
    ancestors: list[Node] = Field(default_factory=list)  # 조상 노드들 (루트부터 순서대로)
    descendants: list[Node] = Field(default_factory=list)  # 하위 노드들
    siblings: list[Node] = Field(default_factory=list)  # 형제 노드들
    path: list[Node] = Field(default_factory=list)  # 루트부터 현재 노드까지의 경로
    total_tokens: int | None = None  # 경로상의 총 토큰 수
