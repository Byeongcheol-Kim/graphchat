"""
세션 관련 API 엔드포인트
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
import logging
import traceback

from backend.schemas.session import Session, SessionCreate, SessionUpdate, SessionWithNodes
from backend.schemas.node import Node, NodeCreate
from backend.core.dependencies import SessionServiceDep

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/v1/sessions", response_model=Session, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    service: SessionServiceDep
) -> Session:
    """새 세션 생성"""
    try:
        session = await service.create_session(session_data)
        return session  # 이미 Session 객체이므로 그대로 반환
    except Exception as e:
        logger.error(f"세션 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 생성 실패")


@router.get("/api/v1/sessions", response_model=List[Session])
async def get_sessions(
    service: SessionServiceDep,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
) -> List[Session]:
    """세션 목록 조회"""
    try:
        sessions = await service.list_sessions(user_id=user_id, skip=skip, limit=limit)
        return sessions  # 이미 Session 객체 리스트이므로 그대로 반환
    except Exception as e:
        logger.error(f"세션 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 목록 조회 실패")


@router.get("/api/v1/sessions/{session_id}", response_model=Session)
async def get_session(
    session_id: str,
    service: SessionServiceDep
) -> Session:
    """특정 세션 조회"""
    try:
        session = await service.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
            
        return session  # 이미 Session 객체이므로 그대로 반환
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 조회 실패")


@router.patch("/api/v1/sessions/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    session_data: SessionUpdate,
    service: SessionServiceDep
) -> Session:
    """세션 업데이트"""
    try:
        session = await service.update_session(session_id, session_data)
        
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
            
        return session  # 이미 Session 객체이므로 그대로 반환
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 업데이트 실패")


@router.put("/api/v1/sessions/{session_id}", response_model=Session)
async def update_session_put(
    session_id: str,
    session_data: SessionUpdate,
    service: SessionServiceDep
) -> Session:
    """세션 업데이트 (PUT)"""
    try:
        session = await service.update_session(session_id, session_data)
        
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
            
        return session  # 이미 Session 객체이므로 그대로 반환
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 업데이트 실패")


@router.get("/api/v1/sessions/{session_id}/nodes", response_model=List[Node])
async def get_session_nodes(
    session_id: str,
    service: SessionServiceDep
) -> List[Node]:
    """세션의 노드 목록 조회"""
    try:
        # 세션 존재 확인
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
        
        # 세션의 노드 목록 조회 - Node 객체 리스트 반환
        nodes = await service.get_session_nodes(session_id)
        return nodes
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 노드 조회 실패")


@router.post("/api/v1/sessions/{session_id}/nodes", response_model=Node, status_code=status.HTTP_201_CREATED)
async def create_session_node(
    session_id: str,
    node_data: NodeCreate,  # Pydantic 모델 사용
    service: SessionServiceDep
) -> Node:
    """세션에 새 노드 생성"""
    try:
        # 세션 존재 확인
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
        
        # 노드 생성 (NodeService를 통해)
        from backend.core.container import get_container
        container = get_container()
        node_service = container.node_service()
        
        # session_id 설정 (필수)
        node_data.session_id = session_id
        
        # Node 객체 반환 (이미 Pydantic 모델)
        node = await node_service.create_node(session_id, node_data)
        
        # WebSocket을 통해 노드 생성 이벤트 브로드캐스트
        from backend.api.websocket.connection_manager import connection_manager
        
        # 부모 노드와의 엣지 정보 포함
        node_event = {
            "type": "node_created",
            "session_id": session_id,
            "node": node.model_dump(),
            "parent_id": node_data.parent_id  # 부모 노드 ID 포함
        }
        
        await connection_manager.broadcast(node_event, session_id)
        
        return node
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 생성 실패: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"노드 생성 실패: {str(e)}")


@router.delete("/api/v1/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    service: SessionServiceDep
):
    """세션 삭제"""
    try:
        success = await service.delete_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
            
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 삭제 실패")


@router.get("/api/v1/sessions/{session_id}/with-nodes", response_model=SessionWithNodes)
async def get_session_with_nodes(
    session_id: str,
    service: SessionServiceDep
) -> SessionWithNodes:
    """노드를 포함한 세션 조회"""
    try:
        session = await service.get_session_with_nodes(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
            
        return session  # 이미 SessionWithNodes 객체이므로 그대로 반환
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 포함 세션 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 포함 세션 조회 실패")
