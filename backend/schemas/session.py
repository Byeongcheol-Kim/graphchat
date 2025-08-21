"""
세션 관련 Pydantic 스키마
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from backend.schemas.node import Node


class SessionBase(BaseModel):
    """세션 기본 스키마"""

    title: str = Field(..., min_length=1, max_length=200)
    metadata: dict[str, Any] | None = Field(default_factory=dict)


class SessionCreate(SessionBase):
    """세션 생성 스키마"""

    user_id: str | None = None


class SessionUpdate(BaseModel):
    """세션 수정 스키마"""

    title: str | None = Field(None, min_length=1, max_length=200)
    metadata: dict[str, Any] | None = None


class Session(SessionBase):
    """세션 응답 스키마"""

    id: str
    user_id: str | None = None  # Optional with default None
    root_node_id: str | None = None  # 루트 노드 ID 추가
    created_at: datetime
    updated_at: datetime
    node_count: int = 0

    class Config:
        from_attributes = True


class SessionWithNodes(Session):
    """노드를 포함한 세션 스키마"""

    nodes: list[Node] = []
