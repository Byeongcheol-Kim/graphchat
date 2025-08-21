"""
메시지 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

MessageRole = Literal["user", "assistant", "system"]


class MessageBase(BaseModel):
    """메시지 기본 스키마"""
    role: MessageRole
    content: str = Field(..., min_length=1)


class MessageCreate(MessageBase):
    """메시지 생성 스키마"""
    node_id: str


class Message(MessageBase):
    """메시지 응답 스키마"""
    id: str
    node_id: str
    timestamp: datetime
    embedding: Optional[List[float]] = None
    
    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    """채팅 메시지 스키마"""
    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    """채팅 요청 스키마"""
    session_id: str
    node_id: str
    message: str
    auto_branch: bool = True  # 자동 분기 활성화 여부


class ChatResponse(BaseModel):
    """채팅 응답 스키마"""
    response: str
    node_id: str
    new_nodes: List[str] = []  # 생성된 새 노드 ID들
    branched: bool = False  # 분기 여부