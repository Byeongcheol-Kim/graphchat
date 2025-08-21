"""
WebSocket 연결 관리
"""

import logging
from datetime import datetime
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


def json_serializable(obj: Any) -> Any:
    """datetime 객체를 JSON 직렬화 가능한 형식으로 변환"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [json_serializable(v) for v in obj]
    return obj


class ConnectionManager:
    """WebSocket 연결 관리자"""

    def __init__(self):
        # session_id -> WebSocket 연결 매핑
        self.active_connections: dict[str, list[WebSocket]] = {}
        # WebSocket -> session_id 역매핑
        self.connection_sessions: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """새 WebSocket 연결 수락"""
        await websocket.accept()

        # 세션별 연결 리스트에 추가
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []

        self.active_connections[session_id].append(websocket)
        self.connection_sessions[websocket] = session_id

        logger.info(f"WebSocket 연결됨: 세션 {session_id}")

        # 연결 확인 메시지 전송
        await self.send_personal_message(
            {"type": "connection", "message": f"Connected to session {session_id}"}, websocket
        )

    def disconnect(self, websocket: WebSocket):
        """WebSocket 연결 해제"""
        session_id = self.connection_sessions.get(websocket)

        if session_id:
            # 세션 연결 리스트에서 제거
            if session_id in self.active_connections:
                self.active_connections[session_id].remove(websocket)

                # 빈 리스트면 세션 키 제거
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]

            # 역매핑에서 제거
            del self.connection_sessions[websocket]

            logger.info(f"WebSocket 연결 해제: 세션 {session_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """특정 WebSocket에 메시지 전송"""
        try:
            # WebSocket 상태 확인
            if websocket.client_state.name != "CONNECTED":
                logger.warning(f"WebSocket이 연결되지 않은 상태: {websocket.client_state.name}")
                return False

            if isinstance(message, dict):
                await websocket.send_json(message)
            else:
                await websocket.send_text(str(message))
            return True
        except Exception as e:
            logger.error(f"메시지 전송 실패: {e}")
            return False

    async def send_error(self, websocket: WebSocket, error_message: str):
        """에러 메시지 전송"""
        error_response = {"type": "error", "message": error_message}
        await self.send_personal_message(error_response, websocket)

    async def broadcast(self, message: dict, session_id: str, exclude: WebSocket = None):
        """세션의 모든 연결에 메시지 브로드캐스트"""
        logger.info(
            f"[WebSocket] 브로드캐스트 시작: session_id={session_id}, message_type={message.get('type')}"
        )

        if session_id not in self.active_connections:
            logger.warning(f"[WebSocket] 세션 {session_id}에 활성 연결이 없음")
            return

        connection_count = len(self.active_connections[session_id])
        logger.info(f"[WebSocket] 세션 {session_id}에 {connection_count}개 연결 발견")

        disconnected = []
        sent_count = 0

        # Pydantic 모델을 dict로 변환
        if hasattr(message, "model_dump"):
            message = message.model_dump()
        elif hasattr(message, "dict"):
            message = message.dict()

        # datetime 객체를 JSON 직렬화 가능하도록 변환
        message = json_serializable(message)

        for connection in self.active_connections[session_id]:
            if connection != exclude:
                try:
                    # WebSocket 상태 확인
                    if connection.client_state.name != "CONNECTED":
                        logger.warning(
                            f"[WebSocket] 연결되지 않은 상태: {connection.client_state.name}"
                        )
                        disconnected.append(connection)
                        continue

                    await connection.send_json(message)
                    sent_count += 1
                    logger.debug(f"[WebSocket] 메시지 전송 성공: {sent_count}/{connection_count}")
                except Exception as e:
                    logger.error(f"[WebSocket] 브로드캐스트 실패: {e}")
                    disconnected.append(connection)

        logger.info(f"[WebSocket] 브로드캐스트 완료: {sent_count}/{connection_count} 성공")

        # 연결 해제된 WebSocket 정리
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_all(self, message: dict):
        """모든 연결에 메시지 브로드캐스트"""
        disconnected = []

        for _session_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"전체 브로드캐스트 실패: {e}")
                    disconnected.append(connection)

        # 연결 해제된 WebSocket 정리
        for conn in disconnected:
            self.disconnect(conn)

    def get_session_connections(self, session_id: str) -> list[WebSocket]:
        """특정 세션의 모든 연결 가져오기"""
        return self.active_connections.get(session_id, [])

    def get_all_sessions(self) -> set[str]:
        """활성 세션 ID 목록"""
        return set(self.active_connections.keys())

    def get_connection_count(self, session_id: str = None) -> int:
        """연결 수 확인"""
        if session_id:
            return len(self.active_connections.get(session_id, []))
        else:
            return sum(len(conns) for conns in self.active_connections.values())


# 전역 연결 관리자 인스턴스
connection_manager = ConnectionManager()
