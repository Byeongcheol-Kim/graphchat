"""
통합 테스트를 위한 pytest fixtures
"""
import asyncio
import pytest
import pytest_asyncio
import httpx
import subprocess
import time
import signal
import os
from typing import AsyncGenerator, Generator
import json


@pytest.fixture(scope="session")
def event_loop():
    """이벤트 루프 fixture"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_config():
    """테스트 설정"""
    return {
        "api_host": "127.0.0.1",
        "api_port": 8003,  # 테스트용 포트 (기본 8000과 충돌 방지)
        "api_base_url": "http://127.0.0.1:8003",
        "startup_timeout": 10,
        "shutdown_timeout": 5
    }


@pytest.fixture(scope="session")
def test_env(test_config):
    """테스트 환경 변수 설정"""
    env = os.environ.copy()
    env.update({
        "API_HOST": test_config["api_host"],
        "API_PORT": str(test_config["api_port"]),
        "DEBUG": "false",
        "LOG_LEVEL": "WARNING",
        # 테스트용 설정
        "OPENROUTER_API_KEY": "test-key",
        "JWT_SECRET": "test-secret-key",
        # FalkorDB 실제 포트 사용
        "FALKORDB_HOST": "localhost",
        "FALKORDB_PORT": "6382",
    })
    return env


@pytest.fixture(scope="session")
def server_process(test_config, test_env):
    """백엔드 서버 프로세스 실행"""
    # 서버 시작
    process = subprocess.Popen(
        ["python", "-m", "backend.main"],
        env=test_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # 서버가 준비될 때까지 대기
    start_time = time.time()
    while time.time() - start_time < test_config["startup_timeout"]:
        try:
            response = httpx.get(f"{test_config['api_base_url']}/health")
            if response.status_code == 200:
                break
        except httpx.ConnectError:
            time.sleep(0.5)
    else:
        process.terminate()
        process.wait(timeout=test_config["shutdown_timeout"])
        raise RuntimeError("서버 시작 실패")
    
    yield process
    
    # 서버 종료
    process.send_signal(signal.SIGINT)
    try:
        process.wait(timeout=test_config["shutdown_timeout"])
    except subprocess.TimeoutExpired:
        process.terminate()
        process.wait()


@pytest_asyncio.fixture
async def api_client(test_config, server_process) -> AsyncGenerator[httpx.AsyncClient, None]:
    """API 클라이언트"""
    async with httpx.AsyncClient(
        base_url=test_config["api_base_url"],
        timeout=httpx.Timeout(10.0)
    ) as client:
        yield client


@pytest_asyncio.fixture
async def test_session(api_client: httpx.AsyncClient):
    """테스트용 세션 생성"""
    response = await api_client.post(
        "/api/v1/sessions",
        json={"title": "통합 테스트 세션"}
    )
    assert response.status_code == 201
    session_data = response.json()
    
    yield session_data
    
    # 세션 정리 (선택적)
    # await api_client.delete(f"/api/v1/sessions/{session_data['id']}")


@pytest.fixture
def sample_messages():
    """테스트용 샘플 메시지"""
    return [
        "안녕하세요, AI와 대화를 시작합니다.",
        "Python과 JavaScript의 차이점을 설명해주세요.",
        "머신러닝과 딥러닝의 관계에 대해 알려주세요.",
        "React와 Vue.js 중 어떤 것을 추천하시나요?",
    ]