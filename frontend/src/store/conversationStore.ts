// Migration wrapper to maintain backward compatibility
import { useBranchStore } from './branchStore'
import { useMessageStore } from './messageStore'
import { useSessionStore } from './sessionStore'
import { useSettingsStore } from './settingsStore'
import { useHistoryStore } from './historyStore'
import { Message, NodeType } from '@/types'
import websocketService from '@/services/websocketService'

// Export Branch type for backward compatibility
export type { Branch } from '@/types'

// This provides a backward-compatible interface for components still using useConversationStore
export const useConversationStore = () => {
  // 전체 store를 가져와서 필요한 것만 추출
  const branchStore = useBranchStore()
  
  
  const { 
    branches,
    currentBranchId,
    setBranches,
    setCurrentBranchId,
    addBranch,
    updateBranch,
    deleteBranch,
    createBranch: createBranchAction,
    createIndependentNode,
    createSummaryNode,
    createReferenceNode,
    deleteNodes,
    addMessageToBranch,
    initializeWithDummyData: initializeWithDummyDataAction,
    createNewSession: createNewSessionAction
  } = branchStore
  
  const messages = useMessageStore(state => state.messages)
  const setMessages = useMessageStore(state => state.setMessages)
  const collectMessagesForBranch = useMessageStore(state => state.collectMessagesForBranch)
  const isLoading = useMessageStore(state => state.isLoading)
  const setLoading = useMessageStore(state => state.setLoading)
  const startStreaming = useMessageStore(state => state.startStreaming)
  
  const sessionName = useSessionStore(state => state.sessionName)
  const edgeLabels = useSessionStore(state => state.edgeLabels)
  const updateSessionName = useSessionStore(state => state.updateSessionName)
  const updateEdgeLabel = useSessionStore(state => state.updateEdgeLabel)
  const initializeEdgeLabels = useSessionStore(state => state.initializeEdgeLabels)
  
  const settings = useSettingsStore(state => state.settings)
  const updateSettings = useSettingsStore(state => state.updateSettings)
  
  const history = useHistoryStore(state => state.history)
  const historyIndex = useHistoryStore(state => state.historyIndex)
  const saveToHistory = useHistoryStore(state => state.saveToHistory)
  const undoAction = useHistoryStore(state => state.undo)
  const redoAction = useHistoryStore(state => state.redo)
  const canUndoValue = useHistoryStore(state => state.canUndo)
  const canRedoValue = useHistoryStore(state => state.canRedo)
  
  // Combined actions
  const switchBranch = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId)
    if (!branch) {
      console.error('[conversationStore.switchBranch] 브랜치를 찾을 수 없음:', branchId)
      return
    }

    // 백엔드에서 메시지 로드
    try {
      const { messageService } = await import('@/services/messageService')
      const messages = await messageService.loadMessagesForNode(branchId)
      
      if (messages.length > 0) {
        setMessages(messages)
      } else {
        // 백엔드에 메시지가 없으면 로컬 메시지 사용
        const newMessages = collectMessagesForBranch(branch, branches)
        setMessages(newMessages)
      }
    } catch (error) {
      console.error('[conversationStore.switchBranch] 메시지 로드 실패:', error)
      const newMessages = collectMessagesForBranch(branch, branches)
      setMessages(newMessages)
    }
    
    // branchStore의 setCurrentBranchId가 비동기 함수이므로 await 사용
    if (typeof setCurrentBranchId === 'function') {
      await setCurrentBranchId(branchId)
    } else {
      console.error('[conversationStore.switchBranch] setCurrentBranchId is not a function')
      // 직접 nodeStore 호출 시도
      try {
        const { useNodeStore } = await import('./nodeStore')
        const nodeStore = useNodeStore.getState()
        if (nodeStore && nodeStore.setCurrentNodeId) {
          nodeStore.setCurrentNodeId(branchId)
        }
      } catch (err) {
        console.error('[conversationStore.switchBranch] nodeStore import 실패:', err)
      }
    }
  }

  const addMessage = async (message: Omit<Message, 'id' | 'timestamp'>) => {
    const currentBranch = branches.find(b => b.id === message.branchId)
    if (!currentBranch) return
    
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
    }
    
    // 메시지 추가
    if (typeof addMessageToBranch === 'function') {
      await addMessageToBranch(message.branchId, newMessage)
    } else {
      console.error('[conversationStore.addMessage] addMessageToBranch is not a function')
      // 직접 nodeStore 호출
      try {
        const { useNodeStore } = await import('./nodeStore')
        const nodeStore = useNodeStore.getState()
        if (nodeStore.addMessageToNode) {
          nodeStore.addMessageToNode(message.branchId, newMessage)
        }
      } catch (err) {
        console.error('[conversationStore.addMessage] nodeStore import 실패:', err)
      }
    }
    setMessages([...messages, newMessage])
    
    // WebSocket을 통해 백엔드로 메시지 전송
    // 백엔드가 자식 노드 유무를 판단하고 필요시 참조 노드를 자동 생성
    if (websocketService.isConnected()) {
      startStreaming(currentBranch.id)  // 현재 노드 ID와 함께 스트리밍 시작
      websocketService.sendChatMessage(message.content, currentBranch.id)
    } else {
      console.error('WebSocket이 연결되지 않음')
    }
  }

  const createBranch = (parentId: string, title: string, type: NodeType) => {
    const branchId = createBranchAction(parentId, title, type)
    saveToHistory({
      branches: JSON.parse(JSON.stringify(branches)),
      currentBranchId,
      messages: [...messages],
      edgeLabels: { ...edgeLabels },
    })
    return branchId
  }

  const initializeWithDummyData = () => {
    initializeWithDummyDataAction()
    initializeEdgeLabels()
    updateSessionName('AI 윤리와 기술 구현 탐구')
    
    // Get updated branches
    const updatedBranches = useBranchStore.getState().branches
    const rootBranch = updatedBranches.find(b => b.id === 'root')
    if (rootBranch) {
      setMessages(rootBranch.messages || [])
    }
    
    saveToHistory({
      branches: JSON.parse(JSON.stringify(updatedBranches)),
      currentBranchId: 'root',
      messages: rootBranch?.messages || [],
      edgeLabels: useSessionStore.getState().edgeLabels,
    })
  }

  const createNewSession = () => {
    saveToHistory({
      branches: JSON.parse(JSON.stringify(branches)),
      currentBranchId,
      messages: [...messages],
      edgeLabels: { ...edgeLabels },
    })
    createNewSessionAction()
    setMessages([])
    updateSessionName(`새 세션 ${new Date().toLocaleDateString('ko-KR')}`)
  }

  const undo = () => {
    undoAction((state) => {
      setBranches(JSON.parse(JSON.stringify(state.branches)))
      setCurrentBranchId(state.currentBranchId)
      setMessages([...state.messages])
      // Reset edge labels
      Object.entries(state.edgeLabels).forEach(([key, value]) => {
        updateEdgeLabel(key, value as string)
      })
    })
  }

  const redo = () => {
    redoAction((state) => {
      setBranches(JSON.parse(JSON.stringify(state.branches)))
      setCurrentBranchId(state.currentBranchId)
      setMessages([...state.messages])
      // Reset edge labels
      Object.entries(state.edgeLabels).forEach(([key, value]) => {
        updateEdgeLabel(key, value as string)
      })
    })
  }
  
  const clearStore = () => {
    // 모든 스토어 초기화
    setBranches([])
    setCurrentBranchId('')
    setMessages([])
    initializeEdgeLabels()
    // clearHistory는 historyStore에 있음
    const clearHistoryAction = useHistoryStore.getState().clearHistory
    if (clearHistoryAction) {
      clearHistoryAction()
    }
  }
  
  return {
    branches,
    currentBranchId,
    messages,
    edgeLabels,
    sessionName,
    settings,
    history,
    historyIndex,
    isLoading,  // 로딩 상태 추가
    
    addMessage,
    switchBranch,
    createBranch,
    createIndependentNode,
    createSummaryNode,
    createReferenceNode,
    deleteNodes,
    initializeWithDummyData,
    createNewSession,
    updateEdgeLabel,
    updateSessionName,
    updateSettings,
    undo,
    redo,
    canUndo: canUndoValue,
    canRedo: canRedoValue,
    clearStore,
  }
}