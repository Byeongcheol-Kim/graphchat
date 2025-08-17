from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.core.branching.models import Branch, BranchType, BranchStatus
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse

router = APIRouter()


@router.get("/", response_model=List[BranchResponse])
async def list_branches(
    conversation_id: Optional[str] = None,
    status: Optional[BranchStatus] = None,
    limit: int = 100,
    offset: int = 0,
):
    """브랜치 목록 조회"""
    # TODO: 데이터베이스에서 브랜치 목록 가져오기
    return []


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(branch_id: str):
    """특정 브랜치 조회"""
    # TODO: 데이터베이스에서 브랜치 가져오기
    raise HTTPException(status_code=404, detail="브랜치를 찾을 수 없습니다")


@router.post("/", response_model=BranchResponse)
async def create_branch(branch: BranchCreate):
    """새 브랜치 생성"""
    # TODO: 브랜치 생성 로직 구현
    return BranchResponse(
        id="branch_new",
        **branch.model_dump()
    )


@router.patch("/{branch_id}", response_model=BranchResponse)
async def update_branch(branch_id: str, branch: BranchUpdate):
    """브랜치 업데이트"""
    # TODO: 브랜치 업데이트 로직 구현
    raise HTTPException(status_code=404, detail="브랜치를 찾을 수 없습니다")


@router.delete("/{branch_id}")
async def delete_branch(branch_id: str):
    """브랜치 삭제"""
    # TODO: 브랜치 삭제 로직 구현
    return {"message": "브랜치가 삭제되었습니다"}


@router.post("/{branch_id}/cross-link")
async def create_cross_link(
    branch_id: str,
    target_branch_id: str,
):
    """브랜치 간 교차 연결 생성"""
    # TODO: 교차 연결 생성 로직 구현
    return {
        "message": "교차 연결이 생성되었습니다",
        "source": branch_id,
        "target": target_branch_id
    }