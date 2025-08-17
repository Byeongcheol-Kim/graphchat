from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.core.branching.models import BranchType, BranchStatus


class BranchCreate(BaseModel):
    """브랜치 생성 스키마"""
    conversation_id: str
    parent_branch_id: Optional[str] = None
    type: BranchType = BranchType.TOPIC
    title: str
    description: Optional[str] = None


class BranchUpdate(BaseModel):
    """브랜치 업데이트 스키마"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[BranchStatus] = None


class BranchResponse(BaseModel):
    """브랜치 응답 스키마"""
    id: str
    conversation_id: str
    parent_branch_id: Optional[str]
    type: BranchType
    status: BranchStatus
    title: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int
    token_count: int
    depth: int
    child_branch_ids: List[str]
    cross_link_ids: List[str]