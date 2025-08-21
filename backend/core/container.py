"""
Dependency Injection Container
"""

import logging

from dependency_injector import containers, providers

from backend.api.websocket.connection_manager import ConnectionManager
from backend.core.config import Settings
from backend.db.falkordb import FalkorDBManager
from backend.services.branching_service import BranchingService
from backend.services.chat_service import ChatService
from backend.services.gemini_service import GeminiService
from backend.services.message_service import MessageService
from backend.services.node_service import NodeService
from backend.services.session_service import SessionService

logger = logging.getLogger(__name__)


class Container(containers.DeclarativeContainer):
    """DI 컨테이너 - 모든 의존성 중앙 관리"""

    # Configuration provider
    config = providers.Configuration()

    # Database
    db_manager = providers.Singleton(
        FalkorDBManager,
        host=config.falkordb_host,
        port=config.falkordb_port,
        graph_name=config.falkordb_graph,
    )

    # External Services
    gemini_service = providers.Singleton(
        GeminiService,
        api_key=config.google_api_key,
        model=config.gemini_model,
    )

    # Business Services
    session_service = providers.Factory(
        SessionService,
        db=db_manager,
    )

    message_service = providers.Factory(
        MessageService,
        db=db_manager,
    )

    # BranchingService를 먼저 정의 (다른 서비스에 의존하지 않음)
    branching_service = providers.Factory(
        BranchingService,
        db=db_manager,
        gemini_service=gemini_service,
    )

    # ChatService 정의 (BranchingService에 의존)
    chat_service = providers.Factory(
        ChatService,
        db=db_manager,
        gemini_service=gemini_service,
        branching_service=branching_service,
    )

    # NodeService 정의 (ChatService와 BranchingService에 의존)
    node_service = providers.Factory(
        NodeService,
        db=db_manager,
        chat_service=chat_service,
        branching_service=branching_service,
    )

    # WebSocket
    websocket_manager = providers.Singleton(ConnectionManager)


# 전역 컨테이너 및 Settings 인스턴스
_container = None
_settings = None


def get_container() -> Container:
    """전역 컨테이너 인스턴스 반환 (싱글톤)"""
    global _container
    if _container is None:
        _container = Container()
        # Settings를 config provider에 로드
        settings = get_settings()
        _container.config.from_pydantic(settings)
    return _container


def get_settings() -> Settings:
    """현재 설정 인스턴스 반환"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_container():
    """컨테이너 초기화 (주로 테스트용)"""
    global _container, _settings
    if _container:
        _container.reset_override()
    _container = None
    _settings = None
