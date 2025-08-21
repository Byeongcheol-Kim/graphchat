"""
FastAPI 의존성 주입 헬퍼
"""
from typing import Annotated
from fastapi import Depends
from dependency_injector.wiring import inject, Provide

from backend.core.container import Container
from backend.db.falkordb import FalkorDBManager
from backend.services.session_service import SessionService
from backend.services.node_service import NodeService
from backend.services.message_service import MessageService
from backend.services.chat_service import ChatService
from backend.services.branching_service import BranchingService


# 서비스 의존성 타입 정의
@inject
async def get_db(
    db_manager: FalkorDBManager = Depends(Provide[Container.db_manager])
) -> FalkorDBManager:
    """데이터베이스 매니저 의존성"""
    return db_manager


@inject
async def get_session_service(
    service: SessionService = Depends(Provide[Container.session_service])
) -> SessionService:
    """세션 서비스 의존성"""
    return service


@inject
async def get_node_service(
    service: NodeService = Depends(Provide[Container.node_service])
) -> NodeService:
    """노드 서비스 의존성"""
    return service


@inject
async def get_message_service(
    service: MessageService = Depends(Provide[Container.message_service])
) -> MessageService:
    """메시지 서비스 의존성"""
    return service


@inject
async def get_chat_service(
    service: ChatService = Depends(Provide[Container.chat_service])
) -> ChatService:
    """채팅 서비스 의존성"""
    return service


@inject
async def get_branching_service(
    service: BranchingService = Depends(Provide[Container.branching_service])
) -> BranchingService:
    """브랜칭 서비스 의존성"""
    return service


# 타입 힌트를 위한 Annotated 타입
DBDep = Annotated[FalkorDBManager, Depends(get_db)]
SessionServiceDep = Annotated[SessionService, Depends(get_session_service)]
NodeServiceDep = Annotated[NodeService, Depends(get_node_service)]
MessageServiceDep = Annotated[MessageService, Depends(get_message_service)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
BranchingServiceDep = Annotated[BranchingService, Depends(get_branching_service)]