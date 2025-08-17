from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class BranchType(str, Enum):
    """브랜치 유형"""
    MAIN = "main"  # 메인 브랜치
    TOPIC = "topic"  # 주제 브랜치
    EXPLORATION = "exploration"  # 탐색 브랜치
    QUESTION = "question"  # 질문 브랜치
    SOLUTION = "solution"  # 해결책 브랜치


class BranchStatus(str, Enum):
    """브랜치 상태"""
    ACTIVE = "active"  # 활성
    PAUSED = "paused"  # 일시정지
    COMPLETED = "completed"  # 완료
    ARCHIVED = "archived"  # 보관


class Branch(BaseModel):
    """브랜치 도메인 모델"""
    id: str = Field(..., description="브랜치 고유 ID")
    conversation_id: str = Field(..., description="대화 ID")
    parent_branch_id: Optional[str] = Field(None, description="부모 브랜치 ID")
    
    type: BranchType = Field(BranchType.TOPIC, description="브랜치 유형")
    status: BranchStatus = Field(BranchStatus.ACTIVE, description="브랜치 상태")
    
    title: str = Field(..., description="브랜치 제목")
    description: Optional[str] = Field(None, description="브랜치 설명")
    
    # 메타데이터
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 통계
    message_count: int = Field(0, description="메시지 수")
    token_count: int = Field(0, description="토큰 수")
    depth: int = Field(0, description="브랜치 깊이")
    
    # 관계
    child_branch_ids: List[str] = Field(default_factory=list, description="자식 브랜치 ID 목록")
    cross_link_ids: List[str] = Field(default_factory=list, description="교차 연결된 브랜치 ID 목록")
    
    # AI 분석 정보
    keywords: List[str] = Field(default_factory=list, description="핵심 키워드")
    topics: List[str] = Field(default_factory=list, description="주제 목록")
    embedding: Optional[List[float]] = Field(None, description="임베딩 벡터")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "branch_123",
                "conversation_id": "conv_456",
                "type": "topic",
                "title": "AI 윤리 논의",
                "description": "AI의 윤리적 측면에 대한 심층 탐구",
            }
        }


class BranchingDecision(BaseModel):
    """분기 결정 모델"""
    should_branch: bool = Field(..., description="분기 여부")
    confidence: float = Field(..., description="신뢰도 (0-1)")
    reason: str = Field(..., description="분기 이유")
    suggested_branches: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="제안된 브랜치 목록"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "should_branch": True,
                "confidence": 0.85,
                "reason": "대화에서 2개의 독립적인 주제가 감지됨",
                "suggested_branches": [
                    {"title": "기술적 구현", "type": "topic"},
                    {"title": "비즈니스 전략", "type": "topic"}
                ]
            }
        }