"""
WebSocket 관련 스키마
"""
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field

WSMessageType = Literal[
    "chat",
    "node_created",
    "node_updated",
    "summary_created",
    "branch_detected",
    "error",
    "connection",
]


class WSMessage(BaseModel):
    """WebSocket 메시지 스키마"""
    type: WSMessageType
    data: Dict[str, Any]
    timestamp: Optional[str] = None


class WSChatMessage(BaseModel):
    """WebSocket 채팅 메시지"""
    session_id: str
    node_id: str
    content: str


class WSNodeUpdate(BaseModel):
    """WebSocket 노드 업데이트"""
    node_id: str
    session_id: str
    action: Literal["created", "updated", "deleted"]
    node_data: Optional[Dict[str, Any]] = None


class WSError(BaseModel):
    """WebSocket 에러"""
    error: str
    details: Optional[str] = None