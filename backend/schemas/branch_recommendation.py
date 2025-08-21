"""브랜치 추천 관련 스키마"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RecommendationStatus(str, Enum):
    """추천 상태"""

    PENDING = "pending"  # 생성되었지만 아직 사용하지 않음
    CREATED = "created"  # 브랜치가 생성됨
    DISMISSED = "dismissed"  # 사용자가 무시함
    EXPIRED = "expired"  # 오래되어 만료됨


class BranchRecommendationBase(BaseModel):
    """브랜치 추천 기본 스키마"""

    title: str = Field(..., description="추천 브랜치 제목")
    description: str = Field(..., description="추천 브랜치 설명")
    type: str = Field(..., description="브랜치 타입 (deep-dive, alternative, summary 등)")
    priority: float = Field(default=0.5, ge=0.0, le=1.0, description="우선순위 (0~1)")
    estimated_depth: int = Field(default=3, ge=1, description="예상 깊이")
    edge_label: str = Field(..., description="엣지 라벨")


class BranchRecommendationCreate(BranchRecommendationBase):
    """브랜치 추천 생성 스키마"""

    message_id: str = Field(..., description="관련 메시지 ID")
    node_id: str = Field(..., description="현재 노드 ID")
    session_id: str = Field(..., description="세션 ID")


class BranchRecommendationUpdate(BaseModel):
    """브랜치 추천 업데이트 스키마"""

    status: RecommendationStatus | None = None
    created_branch_id: str | None = Field(
        None, description="생성된 브랜치 ID (status가 CREATED일 때)"
    )
    dismissed_at: datetime | None = Field(
        None, description="무시한 시간 (status가 DISMISSED일 때)"
    )


class BranchRecommendation(BranchRecommendationBase):
    """브랜치 추천 응답 스키마"""

    id: str
    message_id: str
    node_id: str
    session_id: str
    status: RecommendationStatus = RecommendationStatus.PENDING
    created_branch_id: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    dismissed_at: datetime | None = None

    class Config:
        from_attributes = True


class BranchRecommendationBatch(BaseModel):
    """여러 브랜치 추천 한번에 생성"""

    message_id: str
    node_id: str
    session_id: str
    recommendations: list[BranchRecommendationBase]
