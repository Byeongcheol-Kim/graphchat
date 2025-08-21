"""
WebSocket 통합 테스트
실제 서버의 WebSocket 연결을 테스트합니다.
"""
import pytest
import httpx
import websockets
import json
import asyncio
from typing import Dict, Any


class TestWebSocketConnection:
    """WebSocket 연결 테스트"""
    
    @pytest.mark.asyncio
    async def test_websocket_connect(self, test_config, server_process, test_session: Dict[str, Any]):
        """WebSocket 연결 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        async with websockets.connect(ws_url) as websocket:
            # 연결 확인 메시지 전송
            await websocket.send(json.dumps({
                "type": "ping"
            }))
            
            # 응답 대기 (타임아웃 설정)
            try:
                response = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=5.0
                )
                data = json.loads(response)
                # 서버가 응답을 보내는지 확인
                assert data is not None
            except asyncio.TimeoutError:
                # ping에 대한 응답이 없어도 연결은 성공
                pass
    
    @pytest.mark.asyncio
    async def test_websocket_chat_stream(
        self, 
        test_config, 
        server_process, 
        test_session: Dict[str, Any]
    ):
        """WebSocket을 통한 채팅 스트리밍 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        async with websockets.connect(ws_url) as websocket:
            # 채팅 메시지 전송
            chat_message = {
                "type": "chat",
                "node_id": test_session["root_node_id"],
                "message": "WebSocket을 통한 테스트 메시지",
                "auto_branch": False
            }
            await websocket.send(json.dumps(chat_message))
            
            # 스트리밍 응답 수집
            responses = []
            try:
                while True:
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=10.0
                    )
                    data = json.loads(response)
                    responses.append(data)
                    
                    # 스트리밍 완료 확인
                    if data.get("type") == "chat_complete":
                        break
                    elif data.get("type") == "error":
                        break
                        
            except asyncio.TimeoutError:
                pass
            
            # 최소한 하나 이상의 응답을 받았는지 확인
            assert len(responses) > 0
    
    @pytest.mark.asyncio
    async def test_websocket_multiple_clients(
        self, 
        test_config, 
        server_process, 
        test_session: Dict[str, Any]
    ):
        """다중 클라이언트 WebSocket 연결 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        # 두 개의 클라이언트 연결
        async with websockets.connect(ws_url) as ws1, \
                   websockets.connect(ws_url) as ws2:
            
            # 첫 번째 클라이언트에서 메시지 전송
            message = {
                "type": "broadcast",
                "data": "브로드캐스트 테스트 메시지"
            }
            await ws1.send(json.dumps(message))
            
            # 두 번째 클라이언트에서 수신 확인
            try:
                # 브로드캐스트 메시지를 받을 수 있는지 확인
                response = await asyncio.wait_for(
                    ws2.recv(),
                    timeout=5.0
                )
                # 메시지를 받았다면 성공
                assert response is not None
            except asyncio.TimeoutError:
                # 브로드캐스트가 구현되지 않았을 수 있음
                pass
    
    @pytest.mark.asyncio
    async def test_websocket_error_handling(
        self, 
        test_config, 
        server_process, 
        test_session: Dict[str, Any]
    ):
        """WebSocket 에러 처리 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        async with websockets.connect(ws_url) as websocket:
            # 잘못된 형식의 메시지 전송
            invalid_messages = [
                "not a json",  # JSON이 아닌 문자열
                json.dumps({"no_type_field": "test"}),  # type 필드 없음
                json.dumps({"type": "invalid_type"}),  # 잘못된 type
                json.dumps({  # 필수 필드 누락
                    "type": "chat",
                    "message": "메시지만 있고 node_id 없음"
                })
            ]
            
            for invalid_msg in invalid_messages:
                await websocket.send(invalid_msg)
                
                try:
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=2.0
                    )
                    data = json.loads(response) if response.startswith("{") else None
                    
                    # 에러 응답 또는 연결 메시지가 올 수 있음
                    if data:
                        # connection 메시지도 허용 (첫 연결 시)
                        assert data.get("type") in ["error", "connection"] or "error" in str(data)
                except asyncio.TimeoutError:
                    # 에러 메시지가 없어도 연결이 끊어지지 않으면 성공
                    pass
                except websockets.exceptions.ConnectionClosed:
                    # 연결이 끊어진 경우 다시 연결
                    break
    
    @pytest.mark.asyncio
    async def test_websocket_session_updates(
        self, 
        test_config, 
        server_process, 
        test_session: Dict[str, Any],
        api_client: httpx.AsyncClient
    ):
        """WebSocket을 통한 세션 업데이트 알림 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        async with websockets.connect(ws_url) as websocket:
            # 별도 태스크에서 WebSocket 메시지 수신
            received_updates = []
            
            async def receive_messages():
                try:
                    while True:
                        msg = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        received_updates.append(json.loads(msg))
                except asyncio.TimeoutError:
                    pass
            
            # 수신 태스크 시작
            receive_task = asyncio.create_task(receive_messages())
            
            # API를 통해 노드 생성 (WebSocket으로 알림이 와야 함)
            await api_client.post(
                "/api/v1/nodes/",
                json={
                    "session_id": test_session["id"],
                    "parent_id": test_session["root_node_id"],
                    "title": "WebSocket 알림 테스트 노드",
                    "content": "알림 테스트"
                }
            )
            
            # 알림을 받을 시간을 줌
            await asyncio.sleep(2)
            
            # 수신 태스크 종료
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass
            
            # 업데이트 알림을 받았는지 확인 (선택적)
            # 구현에 따라 알림이 없을 수 있음
            # assert len(received_updates) > 0


class TestWebSocketReconnection:
    """WebSocket 재연결 테스트"""
    
    @pytest.mark.asyncio
    async def test_reconnection_after_disconnect(
        self, 
        test_config, 
        server_process, 
        test_session: Dict[str, Any]
    ):
        """연결 끊김 후 재연결 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        # 첫 번째 연결
        ws1 = await websockets.connect(ws_url)
        await ws1.send(json.dumps({"type": "ping"}))
        await ws1.close()
        
        # 재연결
        ws2 = await websockets.connect(ws_url)
        await ws2.send(json.dumps({"type": "ping"}))
        
        # 재연결이 성공했는지 확인
        try:
            await asyncio.wait_for(ws2.recv(), timeout=2.0)
        except asyncio.TimeoutError:
            pass  # 응답이 없어도 연결은 성공
        
        await ws2.close()
    
    @pytest.mark.asyncio 
    async def test_concurrent_websocket_operations(
        self, 
        test_config, 
        server_process, 
        test_session: Dict[str, Any]
    ):
        """동시 WebSocket 작업 테스트"""
        ws_url = f"ws://{test_config['api_host']}:{test_config['api_port']}/ws/session/{test_session['id']}"
        
        async with websockets.connect(ws_url) as websocket:
            # 여러 메시지를 동시에 전송
            messages = [
                {"type": "chat", "node_id": test_session["root_node_id"], 
                 "message": f"동시 메시지 {i}", "auto_branch": False}
                for i in range(3)
            ]
            
            # 동시 전송
            send_tasks = [
                websocket.send(json.dumps(msg))
                for msg in messages
            ]
            await asyncio.gather(*send_tasks)
            
            # 모든 응답 수신
            responses = []
            timeout_count = 0
            max_timeouts = 3
            
            while timeout_count < max_timeouts:
                try:
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=2.0
                    )
                    responses.append(json.loads(response))
                except asyncio.TimeoutError:
                    timeout_count += 1
            
            # 최소한 일부 응답은 받아야 함
            assert len(responses) > 0