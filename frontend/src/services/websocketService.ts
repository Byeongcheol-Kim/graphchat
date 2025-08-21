import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class WebSocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private messageHandlers: Map<string, Set<Function>> = new Map();

  // WebSocket 연결
  connect(sessionId: string) {
    if (this.socket?.connected && this.sessionId === sessionId) {
      return;
    }

    this.disconnect();
    this.sessionId = sessionId;

    // Socket.IO가 아닌 네이티브 WebSocket 사용 (FastAPI는 기본 WebSocket 사용)
    const wsUrl = `${WS_URL}/ws/session/${sessionId}`;
    
    // WebSocket 연결을 위한 커스텀 구현
    this.initializeWebSocket(wsUrl);
  }

  private initializeWebSocket(url: string) {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
      this.emit('connected', { sessionId: this.sessionId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('메시지 파싱 실패:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 에러:', error);
      this.emit('error', error);
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
      this.emit('disconnected', { sessionId: this.sessionId });
    };

    // WebSocket 인스턴스 저장
    (this as any).ws = ws;
  }

  // 메시지 전송
  send(type: string, data: any) {
    const ws = (this as any).ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    } else {
      console.error('WebSocket이 연결되지 않음');
    }
  }

  // 메시지 핸들러 처리
  private handleMessage(message: any) {
    console.log('WebSocket 메시지 수신:', message);
    const { type } = message;
    
    // 타입별 핸들러 실행 - 전체 메시지를 전달
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      console.log(`${type} 핸들러 실행:`, handlers.size, '개');
      handlers.forEach(handler => handler(message));
    } else {
      console.log(`${type} 타입의 핸들러가 등록되지 않음`);
    }

    // 전역 핸들러 실행
    const globalHandlers = this.messageHandlers.get('*');
    if (globalHandlers) {
      globalHandlers.forEach(handler => handler(message));
    }
  }

  // 이벤트 리스너 등록
  on(event: string, handler: Function) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);

    // 언마운트 시 제거를 위한 cleanup 함수 반환
    return () => this.off(event, handler);
  }

  // 이벤트 리스너 제거
  off(event: string, handler?: Function) {
    if (handler) {
      // 특정 핸들러만 제거
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    } else {
      // 이벤트의 모든 핸들러 제거
      this.messageHandlers.delete(event);
    }
  }

  // 이벤트 발생
  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // 연결 해제
  disconnect() {
    const ws = (this as any).ws;
    if (ws) {
      ws.close();
      (this as any).ws = null;
    }
    this.sessionId = null;
  }

  // 현재 연결 상태 확인
  isConnected(): boolean {
    const ws = (this as any).ws;
    return ws && ws.readyState === WebSocket.OPEN;
  }

  // 채팅 메시지 전송 (스트리밍 모드 지원)
  sendChatMessage(content: string, nodeId?: string, stream: boolean = true) {
    this.send('chat', {
      message: content,
      node_id: nodeId,
      auto_branch: true,
      stream: stream  // 스트리밍 모드 플래그 추가
    });
  }

  // 노드 생성 요청
  createNode(parentId: string, nodeType: string) {
    this.send('create_node', {
      parent_id: parentId,
      type: nodeType  // node_type에서 type으로 변경
    });
  }

  // 노드 업데이트 요청
  updateNode(nodeId: string, updates: any) {
    this.send('update_node', {
      node_id: nodeId,
      updates
    });
  }
}

// 싱글톤 인스턴스
const websocketService = new WebSocketService();

export default websocketService;