"""
pytest 설정 및 공통 fixture
"""

import asyncio
import os
import sys
from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.core.config import Settings
from backend.core.container import get_container
from backend.db.falkordb import FalkorDBManager


# 이벤트 루프 설정
@pytest.fixture(scope="session")
def event_loop():
    """세션 범위 이벤트 루프"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Container wiring 설정
@pytest.fixture(scope="session", autouse=True)
def setup_container():
    """Container wiring 설정"""
    container = get_container()
    # 필요한 모듈들 wiring
    container.wire(
        modules=[
            "backend.api.endpoints.sessions",
            "backend.api.endpoints.nodes",
            "backend.api.endpoints.messages",
            "backend.api.endpoints.websocket",
            "backend.core.dependencies",
        ]
    )
    yield container
    container.unwire()


# 테스트용 설정
@pytest.fixture
def test_settings():
    """테스트용 설정 fixture"""
    return Settings(
        debug=True,
        api_host="127.0.0.1",
        api_port=8001,
        jwt_secret="test-secret-key",
        openai_api_key="test-api-key",
        falkordb_host="localhost",
        falkordb_port=6379,
        redis_host="localhost",
        redis_port=6379,
    )


# 모의 데이터베이스
@pytest.fixture
async def mock_db():
    """모의 데이터베이스 매니저 fixture"""
    db = Mock(spec=FalkorDBManager)
    db.execute_query = AsyncMock()
    db.execute_write = AsyncMock()
    db.graph = Mock()
    db.redis = Mock()

    # 기본 반환값 설정
    db.execute_query.return_value = []
    db.execute_write.return_value = True

    return db


# 테스트 데이터
@pytest.fixture
def sample_session():
    """샘플 세션 데이터"""
    return {
        "id": "session-test-123",
        "title": "테스트 세션",
        "user_id": "user-test-123",
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "node_count": 0,
        "metadata": {"test": True},
    }


@pytest.fixture
def sample_node():
    """샘플 노드 데이터"""
    return {
        "id": "node-test-123",
        "session_id": "session-test-123",
        "title": "테스트 노드",
        "type": "question",
        "parent_id": None,
        "created_at": datetime.now(),
        "token_count": 100,
        "depth": 0,
        "is_active": True,
        "metadata": {"test": True},
    }


@pytest.fixture
def sample_message():
    """샘플 메시지 데이터"""
    return {
        "id": "msg-test-123",
        "node_id": "node-test-123",
        "role": "user",
        "content": "테스트 메시지입니다",
        "timestamp": datetime.now(),
        "embedding": None,
    }


@pytest.fixture
def sample_tree():
    """샘플 트리 구조"""
    return {
        "node": {"id": "main", "title": "메인 노드", "type": "main"},
        "children": [
            {"node": {"id": "child-1", "title": "자식 1", "type": "solution"}, "children": []},
            {
                "node": {"id": "child-2", "title": "자식 2", "type": "solution"},
                "children": [
                    {
                        "node": {"id": "grandchild-1", "title": "손자 1", "type": "question"},
                        "children": [],
                    }
                ],
            },
        ],
    }


# API 클라이언트 모의
@pytest.fixture
def mock_openai_client():
    """OpenAI 클라이언트 모의 fixture"""
    with patch("backend.services.chat_service.openai.AsyncOpenAI") as mock_class:
        client = Mock()
        mock_class.return_value = client

        # 기본 응답 설정
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="AI 응답"))]
        client.chat.completions.create = AsyncMock(return_value=mock_response)

        yield client


# 테스트 헬퍼 함수
def create_mock_query_result(data: dict, key: str = "n"):
    """Cypher 쿼리 결과 모의 생성"""
    return [{key: data}]


def create_mock_tree_query_results(tree_data: dict):
    """트리 쿼리 결과 모의 생성"""
    results = []

    # BFS로 트리 순회하여 쿼리 결과 생성
    queue = [(tree_data, None)]
    while queue:
        node_data, parent_id = queue.pop(0)

        # 노드 쿼리 결과
        results.append([{"n": node_data["node"]}])

        # 자식 쿼리 결과
        children = node_data.get("children", [])
        if children:
            results.append([{"n": child["node"]} for child in children])
            for child in children:
                queue.append((child, node_data["node"]["id"]))
        else:
            results.append([])

    return results


# 테스트 마커
def pytest_configure(config):
    """pytest 설정"""
    config.addinivalue_line("markers", "unit: 단위 테스트")
    config.addinivalue_line("markers", "integration: 통합 테스트")
    config.addinivalue_line("markers", "asyncio: 비동기 테스트")
    config.addinivalue_line("markers", "slow: 느린 테스트")
