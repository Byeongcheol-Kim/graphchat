import socketio
from typing import Dict, Any


def register_handlers(sio: socketio.AsyncServer):
    """
    WebSocket 핸들러 등록
    """
    
    @sio.event
    async def connect(sid, environ):
        print(f"🔗 클라이언트 연결: {sid}")
        await sio.emit("connected", {"message": "연결되었습니다"}, to=sid)
    
    @sio.event
    async def disconnect(sid):
        print(f"🔴 클라이언트 연결 해제: {sid}")
    
    @sio.event
    async def message(sid, data: Dict[str, Any]):
        """
        메시지 처리
        """
        print(f"📨 메시지 수신: {data}")
        
        # TODO: 메시지 처리 로직
        # 1. 분기 필요 여부 판단
        # 2. AI 응답 생성
        # 3. 그래프 업데이트
        
        # 임시 응답
        await sio.emit(
            "response",
            {
                "type": "message",
                "content": f"수신: {data.get('content', '')}",
                "branch_id": data.get("branch_id"),
            },
            to=sid
        )
    
    @sio.event
    async def create_branch(sid, data: Dict[str, Any]):
        """
        브랜치 생성 요청
        """
        print(f"🌱 브랜치 생성 요청: {data}")
        
        # TODO: 브랜치 생성 로직
        
        await sio.emit(
            "branch_created",
            {
                "branch_id": "new_branch_id",
                "parent_id": data.get("parent_id"),
                "title": data.get("title"),
            },
            to=sid
        )
    
    @sio.event
    async def join_conversation(sid, conversation_id: str):
        """
        대화 방 참가
        """
        sio.enter_room(sid, f"conv_{conversation_id}")
        print(f"🚪 {sid}가 대화 {conversation_id}에 참가")
    
    @sio.event
    async def leave_conversation(sid, conversation_id: str):
        """
        대화 방 나가기
        """
        sio.leave_room(sid, f"conv_{conversation_id}")
        print(f"🚀 {sid}가 대화 {conversation_id}에서 나감")