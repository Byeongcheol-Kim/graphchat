"""
메시지 관련 API 엔드포인트
"""
from typing import List
from fastapi import APIRouter, HTTPException, status
import logging

from backend.schemas.message import Message, MessageCreate, ChatRequest, ChatResponse
from backend.core.dependencies import MessageServiceDep, ChatServiceDep

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/v1/messages/node/{node_id}", response_model=List[Message])
async def get_messages_by_node(
    node_id: str,
    service: MessageServiceDep
) -> List[Message]:
    """노드의 메시지 목록 조회"""
    try:
        messages = await service.get_messages_by_node(node_id)
        return messages  # 이미 Message 객체 리스트
    except Exception as e:
        logger.error(f"메시지 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="메시지 목록 조회 실패")


@router.post("/api/v1/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    service: MessageServiceDep
) -> Message:
    """새 메시지 생성"""
    try:
        message = await service.create_message(message_data)
        return message  # 이미 Message 객체
    except Exception as e:
        logger.error(f"메시지 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="메시지 생성 실패")


@router.get("/api/v1/messages/history/{node_id}", response_model=List[Message])
async def get_conversation_history(
    node_id: str,
    service: MessageServiceDep
) -> List[Message]:
    """노드의 대화 기록 조회"""
    try:
        conversation = await service.get_conversation_history(node_id)
        # ConversationHistory 객체에서 messages 추출
        if hasattr(conversation, 'messages'):
            return conversation.messages
        return []
    except Exception as e:
        logger.error(f"대화 기록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="대화 기록 조회 실패")


@router.get("/api/v1/messages/{message_id}", response_model=Message)
async def get_message(
    message_id: str,
    service: MessageServiceDep
) -> Message:
    """특정 메시지 조회"""
    try:
        message = await service.get_message(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다")
        return message  # 이미 Message 객체
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메시지 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="메시지 조회 실패")


@router.get("/api/v1/messages/node/{node_id}/all", response_model=List[Message])
async def get_all_node_messages(
    node_id: str,
    service: MessageServiceDep
) -> List[Message]:
    """노드의 모든 메시지 조회"""
    try:
        messages = await service.list_messages(node_id=node_id, skip=0, limit=1000)
        return messages
    except Exception as e:
        logger.error(f"노드 메시지 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 메시지 조회 실패")


@router.get("/api/v1/messages/node/{node_id}/paginated", response_model=List[Message])
async def get_node_messages_paginated(
    node_id: str,
    service: MessageServiceDep,
    skip: int = 0,
    limit: int = 10
) -> List[Message]:
    """노드의 메시지 페이지네이션 조회"""
    try:
        messages = await service.list_messages(node_id=node_id, skip=skip, limit=limit)
        return messages
    except Exception as e:
        logger.error(f"메시지 페이지네이션 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="메시지 페이지네이션 조회 실패")


@router.delete("/api/v1/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    service: MessageServiceDep
):
    """메시지 삭제"""
    try:
        success = await service.delete_message(message_id)
        if not success:
            raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메시지 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="메시지 삭제 실패")


@router.post("/api/v1/messages/chat", response_model=ChatResponse)
async def chat(
    chat_data: ChatRequest,
    chat_service: ChatServiceDep
) -> ChatResponse:
    """AI 채팅 응답 생성"""
    try:
        result = await chat_service.process_chat(
            session_id=chat_data.session_id,
            node_id=chat_data.node_id,
            message=chat_data.message,
            auto_branch=chat_data.auto_branch
        )
        # result가 ChatProcessResult 객체인 경우
        if hasattr(result, 'response'):
            return ChatResponse(
                response=result.response,
                node_id=result.node_id
            )
        # dict인 경우 (비정상적)
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"채팅 응답 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="채팅 응답 생성 실패")


@router.post("/api/v1/messages/create-branches")
async def create_branches_from_recommendations(
    request: dict,
    chat_service: ChatServiceDep
):
    """추천된 브랜치 생성"""
    try:
        from backend.core.dependencies import get_branching_service
        
        branching_service = await get_branching_service()
        
        parent_node_id = request.get("parent_node_id")
        branches = request.get("branches", [])
        edge_labels = request.get("edge_labels", {})
        
        if not parent_node_id or not branches:
            raise HTTPException(status_code=400, detail="parent_node_id와 branches가 필요합니다")
        
        # 브랜치 생성
        created_branches = await branching_service.create_smart_branches(
            parent_node_id=parent_node_id,
            recommendations=branches,
            auto_approve=True
        )
        
        # 생성된 브랜치의 ID와 엣지 레이블 매핑
        result = {
            "branches": created_branches,
            "edge_labels": edge_labels
        }
        
        return result
    except Exception as e:
        logger.error(f"브랜치 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"브랜치 생성 실패: {str(e)}")