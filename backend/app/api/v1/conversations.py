from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter()


@router.get("/")
async def list_conversations():
    """대화 목록 조회"""
    return []


@router.post("/")
async def create_conversation():
    """새 대화 생성"""
    return {"id": "conv_new", "created": True}