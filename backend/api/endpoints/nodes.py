"""
노드 관련 API 엔드포인트
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
import logging

from backend.schemas.node import (
    Node, NodeCreate, NodeUpdate, NodeWithMessages, NodeTree, 
    SummaryRequest, BranchRequest, ReferenceNodeRequest, 
    DeleteNodesResult, NodeDeletionRequest, NodeRelations
)
from backend.core.dependencies import NodeServiceDep, MessageServiceDep

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/v1/nodes", response_model=Node, status_code=status.HTTP_201_CREATED)
async def create_node(
    node_data: NodeCreate,
    service: NodeServiceDep
) -> Node:
    """새 노드 생성"""
    try:
        # session_id는 NodeCreate에 포함됨
        node = await service.create_node(node_data.session_id, node_data)
        return node  # 이미 Node 객체이므로 변환 불필요
    except Exception as e:
        logger.error(f"노드 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 생성 실패")


@router.get("/api/v1/nodes/{node_id}", response_model=Node)
async def get_node(
    node_id: str,
    service: NodeServiceDep,
    include_messages: bool = True,
) -> Node:
    """노드 조회"""
    try:
        node = await service.get_node(node_id)
        
        if not node:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
        
        # include_messages는 더 이상 사용하지 않음
        # 별도의 with-messages 엔드포인트 사용
        return node  # 이미 Node 객체
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 조회 실패")


@router.get("/api/v1/nodes/session/{session_id}", response_model=List[Node])
async def get_all_session_nodes(
    session_id: str,
    service: NodeServiceDep
) -> List[Node]:
    """세션의 모든 노드 조회"""
    try:
        nodes = await service.list_nodes(
            session_id=session_id,
            parent_id=None,
            skip=0,
            limit=1000  # 충분히 큰 수
        )
        return nodes
    except Exception as e:
        logger.error(f"세션 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="세션 노드 조회 실패")


@router.get("/api/v1/nodes/session/{session_id}/children/{parent_id}", response_model=List[Node])
async def get_session_child_nodes(
    session_id: str,
    parent_id: str,
    service: NodeServiceDep
) -> List[Node]:
    """세션 내 특정 부모의 자식 노드들 조회"""
    try:
        nodes = await service.list_nodes(
            session_id=session_id,
            parent_id=parent_id,
            skip=0,
            limit=100
        )
        return nodes
    except Exception as e:
        logger.error(f"자식 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="자식 노드 조회 실패")


@router.get("/api/v1/nodes/session/{session_id}/paginated", response_model=List[Node])
async def get_session_nodes_paginated(
    session_id: str,
    service: NodeServiceDep,
    skip: int = 0,
    limit: int = 50
) -> List[Node]:
    """세션의 노드 목록 페이지네이션 조회"""
    try:
        nodes = await service.list_nodes(
            session_id=session_id,
            parent_id=None,
            skip=skip,
            limit=limit
        )
        return nodes
    except Exception as e:
        logger.error(f"노드 페이지네이션 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 페이지네이션 조회 실패")


@router.patch("/api/v1/nodes/{node_id}", response_model=Node)
async def update_node(
    node_id: str,
    node_data: NodeUpdate,
    service: NodeServiceDep
) -> Node:
    """노드 수정"""
    try:
        node = await service.update_node(node_id, node_data)
        
        if not node:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
            
        return node  # 이미 Node 객체
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 수정 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 수정 실패")


@router.post("/api/v1/nodes/branch", response_model=List[Node], status_code=status.HTTP_201_CREATED)
async def create_branches(
    branch_data: BranchRequest,
    service: NodeServiceDep
) -> List[Node]:
    """브랜치 노드 생성"""
    try:
        nodes = []
        
        for branch in branch_data.branches:
            node_create = NodeCreate(
                session_id="",  # parent에서 가져올 것
                parent_id=branch_data.parent_id,
                title=branch.title,
                content=branch.content,
                type=branch.type
            )
            
            # parent 노드에서 session_id 가져오기
            parent = await service.get_node(branch_data.parent_id)
            if not parent:
                raise HTTPException(status_code=404, detail="부모 노드를 찾을 수 없습니다")
            
            node_create.session_id = parent.session_id
            node = await service.create_node(parent.session_id, node_create)
            nodes.append(node)  # 이미 Node 객체이므로 변환 불필요
        
        return nodes
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"브랜치 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="브랜치 생성 실패")


@router.delete("/api/v1/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: str,
    service: NodeServiceDep
):
    """단일 노드만 삭제 (하위 노드 제외)"""
    try:
        # 삭제 전에 노드 정보 가져오기 (WebSocket 알림용)
        node = await service.get_node(node_id)
        if not node:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
        
        session_id = node.session_id
        
        success = await service.delete_node(node_id, include_descendants=False)
        
        if not success:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
        
        # WebSocket으로 삭제 알림
        try:
            from backend.api.websocket.connection_manager import manager
            await manager.broadcast_to_session(
                session_id,
                {
                    "type": "node_deleted",
                    "node_id": node_id,
                    "deleted_nodes": [node_id]
                }
            )
        except Exception as ws_error:
            logger.warning(f"WebSocket 알림 전송 실패: {ws_error}")
            
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 삭제 실패")


@router.delete("/api/v1/nodes/{node_id}/cascade", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node_cascade(
    node_id: str,
    service: NodeServiceDep
):
    """노드와 모든 하위 노드 삭제 (CASCADE)"""
    try:
        success = await service.delete_node(node_id, include_descendants=True)
        
        if not success:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
            
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 CASCADE 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 CASCADE 삭제 실패")


@router.post("/api/v1/nodes/delete-multiple", response_model=DeleteNodesResult)
async def delete_multiple_nodes(
    request: NodeDeletionRequest,
    service: NodeServiceDep
) -> DeleteNodesResult:
    """여러 노드 삭제 (단일 노드만)
    
    Args:
        node_ids: 삭제할 노드 ID 리스트
    """
    try:
        if not request.node_ids:
            raise HTTPException(status_code=400, detail="삭제할 노드 ID가 필요합니다")
        
        # 첫 번째 노드로 세션 ID 가져오기
        session_id = None
        if request.node_ids:
            first_node = await service.get_node(request.node_ids[0])
            if first_node:
                session_id = first_node.session_id
        
        result = await service.delete_nodes(
            node_ids=request.node_ids, 
            include_descendants=False
        )
        
        if not result.success and len(result.failed_node_ids) == len(request.node_ids):
            raise HTTPException(
                status_code=400, 
                detail=result.message or "모든 노드 삭제 실패"
            )
        
        # WebSocket으로 삭제 알림
        if session_id and result.deleted_node_ids:
            try:
                from backend.api.websocket.connection_manager import manager
                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type": "nodes_deleted",
                        "deleted_nodes": result.deleted_node_ids
                    }
                )
            except Exception as ws_error:
                logger.warning(f"WebSocket 알림 전송 실패: {ws_error}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"여러 노드 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="여러 노드 삭제 실패")


@router.post("/api/v1/nodes/delete-multiple/cascade", response_model=DeleteNodesResult)
async def delete_multiple_nodes_cascade(
    request: NodeDeletionRequest,
    service: NodeServiceDep
) -> DeleteNodesResult:
    """여러 노드 삭제 (하위 노드 포함)
    
    Args:
        node_ids: 삭제할 노드 ID 리스트
    """
    try:
        if not request.node_ids:
            raise HTTPException(status_code=400, detail="삭제할 노드 ID가 필요합니다")
        
        # 첫 번째 노드로 세션 ID 가져오기
        session_id = None
        if request.node_ids:
            first_node = await service.get_node(request.node_ids[0])
            if first_node:
                session_id = first_node.session_id
        
        result = await service.delete_nodes(
            node_ids=request.node_ids, 
            include_descendants=True
        )
        
        if not result.success and len(result.failed_node_ids) == len(request.node_ids):
            raise HTTPException(
                status_code=400, 
                detail=result.message or "모든 노드 삭제 실패"
            )
        
        # WebSocket으로 삭제 알림
        if session_id and result.deleted_node_ids:
            try:
                from backend.api.websocket.connection_manager import manager
                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type": "nodes_deleted",
                        "deleted_nodes": result.deleted_node_ids
                    }
                )
            except Exception as ws_error:
                logger.warning(f"WebSocket 알림 전송 실패: {ws_error}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"여러 노드 CASCADE 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="여러 노드 CASCADE 삭제 실패")


@router.post("/api/v1/nodes/summary", response_model=Node, status_code=status.HTTP_201_CREATED)
async def create_summary(
    request: SummaryRequest,
    service: NodeServiceDep
) -> Node:
    """요약 노드 생성"""
    try:
        summary_node = await service.create_summary(
            node_ids=request.node_ids,
            is_manual=request.is_manual,
            summary_content=request.summary_content
        )
        return summary_node  # 이미 Node 객체
    except Exception as e:
        logger.error(f"요약 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="요약 생성 실패")


@router.post("/api/v1/nodes/reference", response_model=Node, status_code=status.HTTP_201_CREATED)
async def create_reference(
    request: ReferenceNodeRequest,
    service: NodeServiceDep
) -> Node:
    """참조 노드 생성"""
    try:
        reference_node = await service.create_reference(
            node_ids=request.node_ids,
            title=request.title,
            content=request.content
        )
        
        if not reference_node:
            raise HTTPException(status_code=500, detail="참조 노드 생성 실패")
            
        return reference_node  # 이미 Node 객체
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"참조 노드 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="참조 노드 생성 실패")


@router.get("/api/v1/nodes/{node_id}/with-messages", response_model=NodeWithMessages)
async def get_node_with_messages(
    node_id: str,
    service: NodeServiceDep,
    message_service: MessageServiceDep
) -> NodeWithMessages:
    """메시지를 포함한 노드 조회"""
    try:
        node = await service.get_node(node_id)
        
        if not node:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
        
        # 메시지 조회
        messages = await message_service.get_messages_by_node(node_id)
        
        # NodeWithMessages 객체 생성
        return NodeWithMessages(
            id=node.id,
            session_id=node.session_id,
            parent_id=node.parent_id,
            title=node.title,
            content=node.content,
            type=node.type,
            is_active=node.is_active,
            created_at=node.created_at,
            updated_at=node.updated_at,
            message_count=node.message_count,
            token_count=node.token_count,
            metadata=node.metadata,
            messages=messages
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메시지 포함 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="메시지 포함 노드 조회 실패")


@router.get("/api/v1/nodes/{node_id}/tree", response_model=NodeTree)
async def get_node_tree(
    node_id: str,
    service: NodeServiceDep,
    depth: int = 3  # 현재는 사용하지 않지만 향후 구현 예정
) -> NodeTree:
    """노드 트리 조회"""
    try:
        # depth는 향후 구현 예정, 현재는 전체 트리 반환
        tree = await service.get_node_tree(node_id)
        
        if not tree:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
            
        return tree  # 이미 NodeTree 객체
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"노드 트리 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 트리 조회 실패")


@router.post("/api/v1/nodes/branches", response_model=List[Node], status_code=status.HTTP_201_CREATED)
async def create_branch(
    branch_data: BranchRequest,
    service: NodeServiceDep
) -> List[Node]:
    """브랜치 생성 (별칭)"""
    return await create_branches(branch_data, service)


@router.get("/api/v1/nodes/{node_id}/descendants", response_model=List[Node])
async def get_all_descendants(
    node_id: str,
    service: NodeServiceDep
) -> List[Node]:
    """노드의 모든 하위 노드 조회 (깊이 제한 없음)"""
    try:
        descendants = await service.get_node_descendants(node_id, max_depth=None)
        return descendants
    except Exception as e:
        logger.error(f"하위 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="하위 노드 조회 실패")


@router.get("/api/v1/nodes/{node_id}/descendants/depth/{max_depth}", response_model=List[Node])
async def get_descendants_with_depth(
    node_id: str,
    max_depth: int,
    service: NodeServiceDep
) -> List[Node]:
    """노드의 하위 노드 조회 (깊이 제한)"""
    try:
        if max_depth < 1:
            raise HTTPException(status_code=400, detail="max_depth는 1 이상이어야 합니다")
        
        descendants = await service.get_node_descendants(node_id, max_depth=max_depth)
        return descendants
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"하위 노드 깊이 제한 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="하위 노드 깊이 제한 조회 실패")


@router.get("/api/v1/nodes/{node_id}/ancestors", response_model=List[Node])
async def get_node_ancestors(
    node_id: str,
    service: NodeServiceDep
) -> List[Node]:
    """노드의 상위 노드들 조회"""
    try:
        ancestors = await service.get_node_ancestors(node_id)
        return ancestors
    except Exception as e:
        logger.error(f"상위 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="상위 노드 조회 실패")


@router.get("/api/v1/nodes/{node_id}/path", response_model=List[Node])
async def get_node_path(
    node_id: str,
    service: NodeServiceDep
) -> List[Node]:
    """루트부터 노드까지의 경로 조회"""
    try:
        path = await service.get_node_path(node_id)
        return path
    except Exception as e:
        logger.error(f"노드 경로 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 경로 조회 실패")


@router.get("/api/v1/nodes/session/{session_id}/leaves", response_model=List[Node])
async def get_leaf_nodes(
    session_id: str,
    service: NodeServiceDep
) -> List[Node]:
    """세션의 리프 노드들 조회"""
    try:
        leaf_nodes = await service.get_leaf_nodes(session_id)
        return leaf_nodes
    except Exception as e:
        logger.error(f"리프 노드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="리프 노드 조회 실패")


@router.get("/api/v1/nodes/{node_id}/tokens", response_model=Dict[str, int])
async def get_total_tokens(
    node_id: str,
    service: NodeServiceDep
) -> Dict[str, int]:
    """노드와 조상들의 총 토큰 수 조회"""
    try:
        total_tokens = await service.calculate_total_tokens(node_id)
        return {"total_tokens": total_tokens}
    except Exception as e:
        logger.error(f"토큰 수 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="토큰 수 조회 실패")


@router.get("/api/v1/nodes/{node_id}/relations", response_model=NodeRelations)
async def get_node_relations(
    node_id: str,
    service: NodeServiceDep
) -> NodeRelations:
    """노드의 모든 관계 정보 조회"""
    try:
        relations = await service.get_node_relations(node_id)
        # 토큰 수도 포함
        relations.total_tokens = await service.calculate_total_tokens(node_id)
        return relations
    except Exception as e:
        logger.error(f"노드 관계 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="노드 관계 조회 실패")