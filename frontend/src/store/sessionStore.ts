import { create } from 'zustand'
import { EdgeLabels, Session } from '@/types'
import { getDefaultEdgeLabels } from '@/mocks/dummyData'
import { sessionService } from '@/services/sessionService'
import websocketService from '@/services/websocketService'
import { transformBackendNode } from '@/utils/nodeTransform'

interface SessionState {
  // 세션 정보
  currentSession: Session | null
  sessions: Session[]
  sessionName: string
  edgeLabels: EdgeLabels
  isLoading: boolean
  error: string | null
  sessionsLoaded: boolean
  
  // 세션 관리
  loadSessions: () => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  createSession: (title: string, description?: string) => Promise<void>
  updateSession: (sessionId: string, updates: any) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  setCurrentSession: (session: Session | null) => void
  
  // WebSocket 연결
  connectWebSocket: (sessionId: string) => void
  disconnectWebSocket: () => void
  
  // 기존 메서드
  updateSessionName: (name: string) => void
  updateEdgeLabel: (edgeId: string, label: string) => void
  initializeEdgeLabels: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // 초기 상태
  currentSession: null,
  sessions: [],
  sessionName: 'Branching AI 세션',
  edgeLabels: {},
  isLoading: false,
  error: null,
  sessionsLoaded: false,
  
  // 세션 목록 로드
  loadSessions: async () => {
    const state = get()
    
    // 이미 로드됨 또는 로드 중이면 스킵
    if (state.sessionsLoaded || state.isLoading) {
      console.log('[sessionStore] 세션 이미 로드됨 또는 로드 중, 스킵')
      return
    }
    
    console.log('[sessionStore] 세션 목록 로드 시작')
    set({ isLoading: true, error: null })
    
    try {
      const data = await sessionService.getSessions()
      console.log('[sessionStore] 세션 목록 응답:', data)
      // API가 직접 배열을 반환하는 경우와 sessions 프로퍼티를 반환하는 경우 모두 처리
      const sessions = Array.isArray(data) ? data : (data.sessions || [])
      set({ sessions, isLoading: false, sessionsLoaded: true })
    } catch (error: any) {
      console.error('[sessionStore] 세션 목록 로드 실패:', error)
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 특정 세션 로드
  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null })
    try {
      const session = await sessionService.getSession(sessionId)
      set({ 
        currentSession: session,
        sessionName: session.title,
        isLoading: false 
      })
      
      // localStorage에 세션 ID 저장
      localStorage.setItem('lastSessionId', sessionId)
      
      // 노드 데이터도 함께 로드
      const { loadNodes } = await import('./nodeStore').then(m => m.useNodeStore.getState())
      await loadNodes(sessionId)
      
      // WebSocket 연결
      get().connectWebSocket(sessionId)
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      // 세션 로드 실패 시 localStorage에서 제거
      localStorage.removeItem('lastSessionId')
      throw error // 에러를 다시 throw해서 App.tsx에서 처리할 수 있게 함
    }
  },
  
  // 새 세션 생성
  createSession: async (title: string, description?: string) => {
    set({ isLoading: true, error: null })
    try {
      const session = await sessionService.createSession({ title, description })
      set((state) => ({
        sessions: [...state.sessions, session],
        currentSession: session,
        sessionName: session.title,
        isLoading: false
      }))
      
      // localStorage에 세션 ID 저장
      localStorage.setItem('lastSessionId', session.id)
      
      // 노드 데이터 로드 (새 세션이므로 루트 노드만 있을 것)
      const { loadNodes } = await import('./nodeStore').then(m => m.useNodeStore.getState())
      await loadNodes(session.id)
      
      // WebSocket 연결
      get().connectWebSocket(session.id)
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 세션 업데이트
  updateSession: async (sessionId: string, updates: any) => {
    set({ isLoading: true, error: null })
    try {
      const session = await sessionService.updateSession(sessionId, updates)
      set((state) => ({
        sessions: state.sessions.map(s => s.id === sessionId ? session : s),
        currentSession: state.currentSession?.id === sessionId ? session : state.currentSession,
        sessionName: session.title,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 세션 삭제
  deleteSession: async (sessionId: string) => {
    set({ isLoading: true, error: null })
    try {
      await sessionService.deleteSession(sessionId)
      
      const state = get()
      const isCurrentSession = state.currentSession?.id === sessionId
      
      // 상태 업데이트
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        currentSession: isCurrentSession ? null : state.currentSession,
        sessionName: isCurrentSession ? 'Branching AI 세션' : state.sessionName,  // sessionName도 초기화
        isLoading: false,
        sessionsLoaded: true  // 세션 목록이 로드된 상태 유지
      }))
      
      // 현재 세션이 삭제되면
      if (isCurrentSession) {
        // localStorage에서 제거
        const lastSessionId = localStorage.getItem('lastSessionId')
        if (lastSessionId === sessionId) {
          localStorage.removeItem('lastSessionId')
        }
        // WebSocket 연결 해제
        get().disconnectWebSocket()
        
        // 노드와 메시지 스토어 초기화
        const { useNodeStore } = await import('./nodeStore')
        const { useMessageStore } = await import('./messageStore')
        useNodeStore.getState().clearNodes()
        useMessageStore.getState().clearMessages()
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error  // 에러를 다시 throw해서 호출한 곳에서 처리할 수 있도록
    }
  },
  
  // 현재 세션 설정
  setCurrentSession: (session: Session | null) => {
    set({ currentSession: session })
    if (session) {
      get().connectWebSocket(session.id)
    } else {
      get().disconnectWebSocket()
    }
  },
  
  // WebSocket 연결
  connectWebSocket: (sessionId: string) => {
    // 기존 핸들러 제거
    websocketService.off('connected')
    websocketService.off('disconnected')
    websocketService.off('error')
    websocketService.off('chat_response')
    websocketService.off('node_updated')
    
    websocketService.connect(sessionId)
    
    // WebSocket 이벤트 리스너 등록
    websocketService.on('connection', (message: any) => {
      console.log('WebSocket 연결 확인:', message.message)
    })
    
    websocketService.on('connected', () => {
      console.log('WebSocket 연결됨:', sessionId)
    })
    
    websocketService.on('disconnected', () => {
      console.log('WebSocket 연결 해제됨:', sessionId)
    })
    
    websocketService.on('error', (error: any) => {
      console.error('WebSocket 에러:', error)
      set({ error: 'WebSocket 연결 오류' })
    })
    
    // 채팅 응답 처리
    websocketService.on('chat_response', (message: any) => {
      console.log('채팅 응답 수신:', message)
      
      // 백엔드에서 보낸 메시지 구조: { type: 'chat_response', session_id: '...', data: {...}, updated_node: {...} }
      const data = message.data || message
      
      // 노드 정보 업데이트 (메시지 카운트, 토큰 카운트 등)
      if (message.updated_node) {
        import('./nodeStore').then(({ useNodeStore }) => {
          const nodeStore = useNodeStore.getState()
          nodeStore.updateNode(message.updated_node.id, message.updated_node)
        })
      }
      
      // 메시지를 현재 노드에 추가
      if (data.response) {
        // messageStore 업데이트
        import('./messageStore').then(({ useMessageStore }) => {
          const messageStore = useMessageStore.getState()
          const newMessage = {
            id: `msg_${Date.now()}`,
            content: data.response,
            role: 'assistant' as const,
            branchId: data.node_id || '',
            timestamp: new Date()
          }
          
          // 메시지 추가
          const currentMessages = messageStore.messages || []
          messageStore.setMessages([...currentMessages, newMessage])
          messageStore.setLoading(false)  // 로딩 종료
          
          // 브랜치에도 메시지 추가
          import('./branchStore').then(({ useBranchStore }) => {
            const branchStore = useBranchStore.getState()
            branchStore.addMessageToBranch(data.node_id, newMessage)
          })
        })
      }
      
      // 브랜치 추천이 있는 경우
      if (data.recommended_branches && data.recommended_branches.length > 0) {
        // 브랜치 추천 이벤트 발생
        const event = new CustomEvent('branch-recommendations', {
          detail: {
            recommendations: data.recommended_branches,
            parentNodeId: data.node_id
          }
        })
        window.dispatchEvent(event)
      }
      
      // 새 노드가 생성된 경우 (수동 생성 시)
      if (data.new_nodes && data.new_nodes.length > 0) {
        import('./nodeStore').then(({ useNodeStore }) => {
          const nodeStore = useNodeStore.getState()
          data.new_nodes.forEach((node: any) => {
            // 날짜 필드 변환
            const nodeWithDates = {
              ...node,
              createdAt: node.created_at || node.createdAt ? new Date(node.created_at || node.createdAt) : new Date(),
              updatedAt: node.updated_at || node.updatedAt ? new Date(node.updated_at || node.updatedAt) : undefined,
            }
            nodeStore.addNode(nodeWithDates)
          })
        })
      }
    })
    
    // 노드 생성 처리
    websocketService.on('node_created', (data: any) => {
      console.log('[프론트엔드] node_created 이벤트 수신:', data)
      console.log('[프론트엔드] 현재 sessionId:', sessionId)
      console.log('[프론트엔드] 이벤트 sessionId:', data.session_id)
      console.log('[프론트엔드] sessionId 일치:', data.session_id === sessionId)
      
      if (data.node && data.session_id === sessionId) {
        console.log('[프론트엔드] 노드 생성 처리 시작')
        
        Promise.all([
          import('./nodeStore'),
          import('./branchStore')
        ]).then(([{ useNodeStore }, { useBranchStore }]) => {
          const nodeStore = useNodeStore.getState()
          const branchStore = useBranchStore.getState()
          
          console.log('[프론트엔드] 현재 nodeStore 노드 수:', nodeStore.nodes.length)
          console.log('[프론트엔드] 현재 branchStore 브랜치 수:', branchStore.branches.length)
          
          // 백엔드 노드를 프론트엔드 형식으로 변환
          const transformedNode = transformBackendNode(data.node)
          // parent_id가 이벤트에 별도로 전달되는 경우 처리
          if (data.parent_id) {
            transformedNode.parentId = data.parent_id
          }
          
          // 새 노드 추가
          console.log('[프론트엔드] nodeStore에 노드 추가:', {
            id: transformedNode.id,
            parentId: transformedNode.parentId
          })
          nodeStore.addNode(transformedNode)
          
          // 브랜치 스토어에도 추가 (이미 변환된 노드 사용)
          console.log('[프론트엔드] branchStore에 브랜치 추가:', {
            id: transformedNode.id,
            parentId: transformedNode.parentId
          })
          branchStore.addBranch(transformedNode as Branch)
          
          // 부모 노드와의 관계 설정
          if (data.parent_id) {
            console.log('[프론트엔드] 부모 노드 관계 설정:', data.parent_id, '->', data.node.id)
            
            // nodeStore 업데이트
            setTimeout(() => {
              const currentNodes = useNodeStore.getState().nodes
              const parentNode = currentNodes.find(n => n.id === data.parent_id)
              console.log('[프론트엔드] 부모 노드 찾기 결과:', parentNode ? '찾음' : '못 찾음')
              
              if (parentNode && !parentNode.children?.includes(data.node.id)) {
                console.log('[프론트엔드] 부모 노드 children 업데이트')
                nodeStore.updateNode(data.parent_id, {
                  children: [...(parentNode.children || []), data.node.id]
                })
              }
            }, 100)
            
            // branchStore 업데이트
            const parentBranch = branchStore.branches.find(b => b.id === data.parent_id)
            console.log('[프론트엔드] 부모 브랜치 찾기 결과:', parentBranch ? '찾음' : '못 찾음')
            
            if (parentBranch && !parentBranch.children?.includes(data.node.id)) {
              console.log('[프론트엔드] 부모 브랜치 children 업데이트')
              branchStore.updateBranch(data.parent_id, {
                children: [...(parentBranch.children || []), data.node.id]
              })
            }
          }
          
          console.log('[프론트엔드] 노드 생성 처리 완료')
          console.log('[프론트엔드] 최종 nodeStore 노드 수:', useNodeStore.getState().nodes.length)
          console.log('[프론트엔드] 최종 branchStore 브랜치 수:', useBranchStore.getState().branches.length)
        })
      } else {
        console.log('[프론트엔드] 노드 생성 이벤트 무시됨 (조건 불일치)')
      }
    })
    
    // 노드 업데이트 처리
    websocketService.on('node_updated', (data: any) => {
      console.log('노드 업데이트:', data)
      if (data.data) {
        import('./nodeStore').then(({ useNodeStore }) => {
          const nodeStore = useNodeStore.getState()
          nodeStore.updateNode(data.data.id, data.data)
        })
      }
    })
  },
  
  // WebSocket 연결 해제
  disconnectWebSocket: () => {
    websocketService.disconnect()
  },
  
  // 기존 메서드들
  updateSessionName: (name) => {
    set({ sessionName: name })
    // 서버에도 업데이트
    const currentSession = get().currentSession
    if (currentSession) {
      get().updateSession(currentSession.id, { title: name })
    }
  },
  
  updateEdgeLabel: (edgeId, label) => {
    set((state) => {
      const newEdgeLabels = { ...state.edgeLabels }
      if (label.trim()) {
        newEdgeLabels[edgeId] = label
      } else {
        delete newEdgeLabels[edgeId]
      }
      return { edgeLabels: newEdgeLabels }
    })
  },
  
  initializeEdgeLabels: () => {
    set({ edgeLabels: getDefaultEdgeLabels() })
  },
}))