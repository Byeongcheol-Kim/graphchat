"""브랜치 추천 관련 API 엔드포인트"""
from typing import List, Dict, Optional, Annotated
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.schemas.branch_recommendation import (
    BranchRecommendation,
    BranchRecommendationCreate,
    BranchRecommendationUpdate,
    BranchRecommendationBatch,
    RecommendationStatus
)
from backend.services.branch_recommendation_service import BranchRecommendationService
from backend.core.dependencies import get_db
from backend.db.falkordb import FalkorDBManager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["recommendations"])

# 의존성 주입
async def get_recommendation_service(
    db: FalkorDBManager = Depends(get_db)
) -> BranchRecommendationService:
    return BranchRecommendationService(db)

RecommendationServiceDep = Annotated[BranchRecommendationService, Depends(get_recommendation_service)]


@router.post("/api/v1/recommendations", response_model=BranchRecommendation)
async def create_recommendation(
    recommendation: BranchRecommendationCreate,
    service: RecommendationServiceDep
) -> BranchRecommendation:
    """단일 브랜치 추천 생성"""
    try:
        return await service.create_recommendation(recommendation)
    except Exception as e:
        logger.error(f"브랜치 추천 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/recommendations/batch", response_model=List[BranchRecommendation])
async def create_recommendations_batch(
    batch: BranchRecommendationBatch,
    service: RecommendationServiceDep
) -> List[BranchRecommendation]:
    """여러 브랜치 추천 한번에 생성"""
    try:
        return await service.create_recommendations_batch(batch)
    except Exception as e:
        logger.error(f"배치 추천 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/recommendations/message/{message_id}", response_model=List[BranchRecommendation])
async def get_recommendations_for_message(
    message_id: str,
    service: RecommendationServiceDep
) -> List[BranchRecommendation]:
    """특정 메시지의 브랜치 추천 조회"""
    try:
        return await service.get_recommendations_for_message(message_id)
    except Exception as e:
        logger.error(f"메시지 추천 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/recommendations/node/{node_id}", response_model=List[BranchRecommendation])
async def get_recommendations_for_node(
    node_id: str,
    service: RecommendationServiceDep,
    status: Optional[RecommendationStatus] = Query(None, description="상태 필터")
) -> List[BranchRecommendation]:
    """특정 노드의 브랜치 추천 조회"""
    try:
        return await service.get_recommendations_for_node(node_id, status)
    except Exception as e:
        logger.error(f"노드 추천 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/recommendations/session/{session_id}", response_model=Dict[str, List[BranchRecommendation]])
async def get_recommendations_for_session(
    session_id: str,
    service: RecommendationServiceDep
) -> Dict[str, List[BranchRecommendation]]:
    """세션의 모든 활성 추천을 노드별로 그룹화하여 반환"""
    try:
        return await service.get_active_recommendations_for_session(session_id)
    except Exception as e:
        logger.error(f"세션 추천 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/v1/recommendations/{recommendation_id}", response_model=BranchRecommendation)
async def update_recommendation(
    recommendation_id: str,
    update: BranchRecommendationUpdate,
    service: RecommendationServiceDep
) -> BranchRecommendation:
    """브랜치 추천 상태 업데이트"""
    try:
        return await service.update_recommendation(recommendation_id, update)
    except Exception as e:
        logger.error(f"추천 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/recommendations/{recommendation_id}/create-branch", response_model=BranchRecommendation)
async def mark_recommendation_as_created(
    recommendation_id: str,
    service: RecommendationServiceDep,
    created_branch_id: str = Query(..., description="생성된 브랜치 ID")
) -> BranchRecommendation:
    """브랜치 생성 완료 표시"""
    try:
        return await service.mark_as_created(recommendation_id, created_branch_id)
    except Exception as e:
        logger.error(f"브랜치 생성 표시 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/recommendations/{recommendation_id}/dismiss", response_model=BranchRecommendation)
async def dismiss_recommendation(
    recommendation_id: str,
    service: RecommendationServiceDep
) -> BranchRecommendation:
    """브랜치 추천 무시"""
    try:
        return await service.mark_as_dismissed(recommendation_id)
    except Exception as e:
        logger.error(f"추천 무시 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))