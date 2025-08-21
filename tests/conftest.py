"""
테스트 환경 설정
"""
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from fastapi import FastAPI
from unittest.mock import Mock, AsyncMock
from dependency_injector import providers

from backend.core.container import Container, get_container
from backend.core.config import Settings
from backend.db.falkordb import FalkorDBManager
from backend.main import create_app


@pytest.fixture
def mock_settings():
    """테스트용 설정 Mock"""
    return Mock(
        spec=Settings,
        environment="test",  # 환경 변수 대신 직접 설정
        google_api_key="test-api-key",
        gemini_model="test-model",
        falkordb_graph="test_branching_ai",
        falkordb_host="localhost",
        falkordb_port=6382,
        redis_host="localhost",
        redis_port=6380,
        redis_db=1,
        jwt_secret="test-secret",
        debug=False,
        log_level="WARNING",
        api_host="0.0.0.0",
        api_port=8000,
        api_prefix="/api",
        cors_origins=["http://test"],
        falkordb_url="redis://localhost:6382",
        redis_url="redis://localhost:6380/1"
    )


@pytest.fixture
def mock_db_manager():
    """테스트용 DB Manager Mock"""
    mock = AsyncMock(spec=FalkorDBManager)
    mock.graph = Mock()
    mock.execute_query = AsyncMock(return_value=[])
    mock.execute_write = AsyncMock(return_value=True)
    mock.connect = AsyncMock()
    mock.disconnect = AsyncMock()
    return mock


@pytest.fixture
def test_container(mock_settings, mock_db_manager):
    """테스트용 컨테이너 - 실제 Container를 사용하되 서비스만 오버라이드"""
    container = Container()
    
    # Settings 오버라이드 - Mock 객체 사용
    container.settings.override(providers.Object(mock_settings))
    
    # DB Manager 오버라이드 - Mock 객체 사용
    container.db_manager.override(providers.Object(mock_db_manager))
    
    # 필요시 다른 서비스도 오버라이드 가능
    # 예: OpenRouter 서비스 Mock
    # mock_openrouter = Mock()
    # container.openrouter_service.override(providers.Object(mock_openrouter))
    
    yield container
    
    # 테스트 후 오버라이드 초기화
    container.reset_override()


@pytest_asyncio.fixture
async def test_db(test_container):
    """테스트용 데이터베이스 (Mock 사용)"""
    db_manager = test_container.db_manager()
    
    # Mock이므로 실제 연결은 필요 없지만 호출은 시뮬레이션
    await db_manager.connect()
    
    yield db_manager
    
    await db_manager.disconnect()


@pytest.fixture
def test_app(test_container) -> FastAPI:
    """테스트용 FastAPI 애플리케이션"""
    app = create_app()
    
    # 테스트용 컨테이너로 교체
    app.state.container = test_container
    
    # 의존성 주입 와이어링
    test_container.wire(modules=["backend.core.dependencies"])
    
    return app


@pytest_asyncio.fixture
async def test_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """테스트용 HTTP 클라이언트"""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        yield client


# 실제 DB를 사용하는 통합 테스트용 fixture
@pytest.fixture
def integration_container():
    """통합 테스트용 컨테이너 - 실제 서비스 사용"""
    from backend.core.container import reset_container
    
    # 새 컨테이너 생성
    container = Container()
    
    # 테스트 DB 설정만 오버라이드
    test_settings = Settings(falkordb_graph="test_integration_branching_ai")
    container.settings.override(providers.Object(test_settings))
    
    yield container
    
    container.reset_override()
    reset_container()  # 전역 컨테이너 초기화


@pytest_asyncio.fixture
async def integration_db(integration_container):
    """통합 테스트용 실제 데이터베이스"""
    db_manager = integration_container.db_manager()
    
    # 실제 연결
    await db_manager.connect()
    
    # 테스트 그래프 초기화
    try:
        await db_manager.execute_write("MATCH (n) DETACH DELETE n")
    except:
        pass
    
    yield db_manager
    
    # 정리
    try:
        await db_manager.execute_write("MATCH (n) DETACH DELETE n")
    except:
        pass
    
    await db_manager.disconnect()


# 샘플 데이터 fixtures
@pytest.fixture
def sample_session_data():
    """샘플 세션 데이터"""
    return {
        "title": "테스트 세션",
        "user_id": "test_user",
        "model": "gpt-4",
        "metadata": {
            "purpose": "테스트"
        }
    }


@pytest.fixture
def sample_node_data():
    """샘플 노드 데이터"""
    return {
        "session_id": "",  # 테스트에서 채워짐
        "parent_id": None,
        "title": "테스트 노드",
        "content": "테스트 컨텐츠",
        "type": "root"
    }


@pytest.fixture
def sample_message_data():
    """샘플 메시지 데이터"""
    return {
        "node_id": "",  # 테스트에서 채워짐
        "role": "user",
        "content": "테스트 메시지"
    }