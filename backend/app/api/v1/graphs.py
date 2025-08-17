from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{conversation_id}")
async def get_graph(conversation_id: str):
    """대화 그래프 조회"""
    return {
        "conversation_id": conversation_id,
        "nodes": [],
        "edges": []
    }