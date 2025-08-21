"""
API 통합 테스트
실제 서버를 실행하고 API 엔드포인트를 테스트합니다.
"""
import pytest
import httpx
from typing import Dict, Any


class TestHealthCheck:
    """헬스 체크 테스트"""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, api_client: httpx.AsyncClient):
        """헬스 체크 엔드포인트 테스트"""
        response = await api_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, api_client: httpx.AsyncClient):
        """루트 엔드포인트 테스트"""
        response = await api_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Branching AI API"
        assert "version" in data
        assert "docs" in data


class TestSessionAPI:
    """세션 API 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_create_session(self, api_client: httpx.AsyncClient):
        """세션 생성 테스트"""
        response = await api_client.post(
            "/api/v1/sessions",
            json={"title": "테스트 세션"}
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["title"] == "테스트 세션"
        assert "id" in data
        assert "root_node_id" in data  # 루트 노드 자동 생성 확인
        assert "created_at" in data
        assert "updated_at" in data
        assert data["node_count"] == 1  # 루트 노드 포함
    
    @pytest.mark.asyncio
    async def test_get_session(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """세션 조회 테스트"""
        response = await api_client.get(f"/api/v1/sessions/{test_session['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_session["id"]
        assert data["title"] == test_session["title"]
    
    @pytest.mark.asyncio
    async def test_update_session(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """세션 업데이트 테스트"""
        new_title = "업데이트된 세션"
        response = await api_client.patch(
            f"/api/v1/sessions/{test_session['id']}",
            json={"title": new_title}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == new_title
        assert data["id"] == test_session["id"]
    
    @pytest.mark.asyncio
    async def test_list_sessions(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """세션 목록 조회 테스트"""
        response = await api_client.get("/api/v1/sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # 최소한 test_session이 포함되어야 함
        session_ids = [s["id"] for s in data]
        assert test_session["id"] in session_ids
    
    @pytest.mark.asyncio
    async def test_delete_session(self, api_client: httpx.AsyncClient):
        """세션 삭제 테스트"""
        # 삭제용 세션 생성
        create_response = await api_client.post(
            "/api/v1/sessions",
            json={"title": "삭제할 세션"}
        )
        session_id = create_response.json()["id"]
        
        # 세션 삭제
        response = await api_client.delete(f"/api/v1/sessions/{session_id}")
        assert response.status_code == 204
        
        # 삭제 확인
        get_response = await api_client.get(f"/api/v1/sessions/{session_id}")
        assert get_response.status_code == 404


class TestNodeAPI:
    """노드 API 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_create_node(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """노드 생성 테스트"""
        response = await api_client.post(
            "/api/v1/nodes",
            json={
                "session_id": test_session["id"],
                "parent_id": test_session["root_node_id"],
                "title": "테스트 노드",
                "content": "테스트 내용",
                "type": "branch"  # type 필드 추가
            }
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["title"] == "테스트 노드"
        assert data["content"] == "테스트 내용"
        assert data["session_id"] == test_session["id"]
        assert "id" in data
    
    @pytest.mark.asyncio
    async def test_get_node(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """노드 조회 테스트"""
        # 루트 노드 조회
        response = await api_client.get(f"/api/v1/nodes/{test_session['root_node_id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_session["root_node_id"]
        assert data["type"] == "root"
    
    @pytest.mark.asyncio
    async def test_create_branch(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """브랜치 생성 테스트"""
        response = await api_client.post(
            "/api/v1/nodes/branch",
            json={
                "parent_id": test_session['root_node_id'],
                "branches": [
                    {"title": "브랜치 1", "content": "첫 번째 브랜치", "type": "branch"},
                    {"title": "브랜치 2", "content": "두 번째 브랜치", "type": "branch"}
                ]
            }
        )
        assert response.status_code == 201
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["title"] == "브랜치 1"
        assert data[1]["title"] == "브랜치 2"


class TestMessageAPI:
    """메시지 API 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_chat_request(self, api_client: httpx.AsyncClient, test_session: Dict[str, Any]):
        """채팅 요청 테스트"""
        response = await api_client.post(
            "/api/v1/messages/chat",
            json={
                "session_id": test_session["id"],
                "node_id": test_session["root_node_id"],
                "message": "안녕하세요",
                "auto_branch": False  # 자동 분기 비활성화
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert data["node_id"] == test_session["root_node_id"]
        assert "new_nodes" in data
        assert "branched" in data
    
    @pytest.mark.asyncio
    async def test_chat_with_auto_branch(
        self, 
        api_client: httpx.AsyncClient, 
        test_session: Dict[str, Any]
    ):
        """자동 분기 포함 채팅 테스트"""
        # 복잡한 주제로 자동 분기 유도
        response = await api_client.post(
            "/api/v1/messages/chat",
            json={
                "session_id": test_session["id"],
                "node_id": test_session["root_node_id"],
                "message": "Python의 장점, 단점, 그리고 웹 개발과 데이터 과학에서의 활용에 대해 설명해주세요.",
                "auto_branch": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        # 자동 분기가 발생할 수도 있음
        if data["branched"]:
            assert len(data["new_nodes"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_conversation_history(
        self, 
        api_client: httpx.AsyncClient, 
        test_session: Dict[str, Any]
    ):
        """대화 기록 조회 테스트"""
        # 먼저 메시지 생성
        await api_client.post(
            "/api/v1/messages/chat",
            json={
                "session_id": test_session["id"],
                "node_id": test_session["root_node_id"],
                "message": "테스트 메시지",
                "auto_branch": False
            }
        )
        
        # 대화 기록 조회
        response = await api_client.get(
            f"/api/v1/messages/history/{test_session['root_node_id']}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # 사용자 메시지와 AI 응답이 포함되어야 함
        roles = [msg["role"] for msg in data]
        assert "user" in roles


class TestChatFlow:
    """전체 채팅 플로우 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_complete_chat_flow(
        self, 
        api_client: httpx.AsyncClient,
        sample_messages: list
    ):
        """완전한 채팅 플로우 테스트"""
        # 1. 세션 생성
        session_response = await api_client.post(
            "/api/v1/sessions",
            json={"title": "플로우 테스트 세션"}
        )
        session = session_response.json()
        
        # 2. 여러 메시지 전송
        node_id = session["root_node_id"]
        for message in sample_messages[:2]:
            chat_response = await api_client.post(
                "/api/v1/messages/chat",
                json={
                    "session_id": session["id"],
                    "node_id": node_id,
                    "message": message,
                    "auto_branch": False
                }
            )
            assert chat_response.status_code == 200
        
        # 3. 대화 기록 확인
        history_response = await api_client.get(
            f"/api/v1/messages/history/{node_id}"
        )
        history = history_response.json()
        # 각 메시지마다 사용자와 AI 응답이 있어야 함
        assert len(history) >= 4  # 2개 메시지 * 2 (user + assistant)
        
        # 4. 브랜치 생성
        branch_response = await api_client.post(
            "/api/v1/nodes/branch",
            json={
                "parent_id": node_id,
                "branches": [
                    {"title": "Python 심화", "content": "Python 고급 주제", "type": "branch"},
                    {"title": "JavaScript 심화", "content": "JavaScript 고급 주제", "type": "branch"}
                ]
            }
        )
        branches = branch_response.json()
        
        # 5. 브랜치에서 대화 계속
        python_branch = branches[0]
        branch_chat_response = await api_client.post(
            "/api/v1/messages/chat",
            json={
                "session_id": session["id"],
                "node_id": python_branch["id"],
                "message": "Python의 데코레이터에 대해 설명해주세요.",
                "auto_branch": False
            }
        )
        assert branch_chat_response.status_code == 200
        
        # 6. 세션 전체 구조 확인
        session_detail_response = await api_client.get(
            f"/api/v1/sessions/{session['id']}/nodes"
        )
        assert session_detail_response.status_code == 200
        session_detail = session_detail_response.json()
        # 루트 노드 + 2개 브랜치 = 최소 3개 노드
        assert len(session_detail.get("nodes", [])) >= 3
    
    @pytest.mark.asyncio
    async def test_error_handling(self, api_client: httpx.AsyncClient):
        """에러 처리 테스트"""
        # 존재하지 않는 세션
        response = await api_client.get("/api/v1/sessions/non-existent-id")
        assert response.status_code == 404
        
        # 잘못된 요청 데이터
        response = await api_client.post(
            "/api/v1/sessions",
            json={"invalid_field": "test"}
        )
        assert response.status_code == 422
        
        # 필수 필드 누락
        response = await api_client.post(
            "/api/v1/messages/chat",
            json={"message": "테스트"}
        )
        assert response.status_code == 422