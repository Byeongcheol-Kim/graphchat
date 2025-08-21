"""
노드 관련 Pydantic 스키마
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field

from backend.schemas.message import Message

NodeType = Literal["root", "main", "topic", "exploration", "question", "solution", "summary", "reference"]


class NodeMetadata(BaseModel):
    """노드 메타데이터 스키마"""
    branch_type: Optional[str] = None  # topics, details, alternatives, questions, examples
    priority: Optional[float] = None  # 0.0 ~ 1.0
    estimated_depth: Optional[int] = None  # 예상 깊이
    auto_generated: Optional[bool] = False  # 자동 생성 여부
    created_by: Optional[str] = None  # 생성자 (user, system, ai)
    tags: Optional[List[str]] = Field(default_factory=list)  # 태그 목록
    custom_data: Optional[Dict[str, Any]] = Field(default_factory=dict)  # 사용자 정의 데이터
    
    class Config:
        extra = "allow"  # 추가 필드 허용


class NodeBase(BaseModel):
    """노드 기본 스키마"""
    title: str = Field(..., min_length=1, max_length=200)
    type: NodeType
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)  # NodeMetadata로 변환 가능


class NodeCreate(NodeBase):
    """노드 생성 스키마"""
    session_id: Optional[str] = None  # 엔드포인트에서 설정 가능
    parent_id: Optional[str] = None
    content: Optional[str] = None
    is_summary: bool = False
    summary_content: Optional[str] = None


class NodeUpdate(BaseModel):
    """노드 수정 스키마"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class Node(NodeBase):
    """노드 응답 스키마"""
    id: str
    session_id: str
    parent_id: Optional[str] = None
    content: Optional[str] = None  # 노드 내용
    source_node_ids: Optional[List[str]] = None  # 요약 노드의 소스 노드들
    is_summary: bool = False
    is_generating: bool = False  # 생성 중 상태 (요약 생성 중 등)
    summary_content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    message_count: int = 0  # 노드의 메시지 개수
    token_count: int = 0
    depth: int = 0
    is_active: bool = True
    
    class Config:
        from_attributes = True


class NodeWithMessages(Node):
    """메시지를 포함한 노드 스키마"""
    messages: List[Message] = []


class NodeTree(BaseModel):
    """노드 트리 스키마"""
    node: Node
    children: List[NodeTree] = []
    
    class Config:
        from_attributes = True


class SummaryRequest(BaseModel):
    """요약 생성 요청 스키마"""
    node_ids: List[str] = Field(..., min_items=1)
    is_manual: bool = False
    summary_content: Optional[str] = None  # 수동 요약일 경우


class BranchItem(BaseModel):
    """브랜치 아이템 스키마"""
    title: str
    content: Optional[str] = None
    type: NodeType = "solution"
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class BranchRequest(BaseModel):
    """브랜치 생성 요청 스키마"""
    parent_id: str
    branches: List[BranchItem]


class ReferenceNodeRequest(BaseModel):
    """참조 노드 생성 요청 스키마"""
    node_ids: List[str] = Field(..., min_items=1)
    title: Optional[str] = None
    content: Optional[str] = None


class DeleteNodesResult(BaseModel):
    """노드 삭제 결과 스키마"""
    success: bool
    deleted_count: int = 0
    deleted_node_ids: List[str] = Field(default_factory=list)
    message: Optional[str] = None


class NodeDeletionRequest(BaseModel):
    """노드 삭제 요청 스키마"""
    node_ids: List[str] = Field(..., min_items=1)
    include_descendants: bool = True


class NodeRelations(BaseModel):
    """노드 관계 정보 스키마"""
    current: Optional[Node] = None
    ancestors: List[Node] = Field(default_factory=list)  # 조상 노드들 (루트부터 순서대로)
    descendants: List[Node] = Field(default_factory=list)  # 하위 노드들
    siblings: List[Node] = Field(default_factory=list)  # 형제 노드들
    path: List[Node] = Field(default_factory=list)  # 루트부터 현재 노드까지의 경로
    total_tokens: Optional[int] = None  # 경로상의 총 토큰 수