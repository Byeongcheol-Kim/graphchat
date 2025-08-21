import { create } from 'zustand'
import { Message, Branch } from '@/types'

interface MessageState {
  messages: Message[]
  isLoading: boolean  // AI 응답 대기 중
  streamingContent: string  // 스트리밍 중인 메시지 내용
  streamingNodeId: string | null  // 스트리밍 중인 노드 ID
  
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  collectMessagesForBranch: (branch: Branch, branches: Branch[]) => Message[]
  setLoading: (loading: boolean) => void
  
  // 스트리밍 관련 메서드
  startStreaming: (nodeId: string) => void
  appendStreamChunk: (chunk: string) => void
  endStreaming: (fullContent: string, messageId: string) => void
  clearStreaming: () => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  streamingContent: '',
  streamingNodeId: null,
  
  setMessages: (messages) => {
    set({ messages })
  },
  
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },
  
  clearMessages: () => {
    set({ messages: [] })
  },
  
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
  
  // 스트리밍 관련 메서드
  startStreaming: (nodeId) => {
    set({ 
      streamingNodeId: nodeId,
      streamingContent: '',
      isLoading: true
    })
  },
  
  appendStreamChunk: (chunk) => {
    set((state) => ({
      streamingContent: state.streamingContent + chunk
    }))
  },
  
  endStreaming: (fullContent, messageId) => {
    set((state) => {
      // 스트리밍 완료된 메시지를 정식 메시지로 추가
      const newMessage: Message = {
        id: messageId,
        content: fullContent,
        role: 'assistant',
        branchId: state.streamingNodeId || '',
        timestamp: new Date()
      }
      
      return {
        messages: [...state.messages, newMessage],
        streamingContent: '',
        streamingNodeId: null,
        isLoading: false
      }
    })
  },
  
  clearStreaming: () => {
    set({
      streamingContent: '',
      streamingNodeId: null,
      isLoading: false
    })
  },
  
  collectMessagesForBranch: (currentBranch, branches) => {
    const messages: Message[] = []
    
    // 머지 노드의 경우 여러 부모 브랜치들의 메시지 수집
    if (currentBranch.isMerge && currentBranch.parentIds) {
      // 공통 조상 브랜치 찾기
      const findCommonAncestors = (branchIds: string[]): Set<string> => {
        const ancestorSets = branchIds.map(branchId => {
          const ancestors = new Set<string>()
          let current = branches.find(b => b.id === branchId)
          while (current) {
            ancestors.add(current.id)
            current = current.parentId 
              ? branches.find(b => b.id === current!.parentId)
              : undefined
          }
          return ancestors
        })
        
        // 모든 브랜치의 공통 조상 찾기
        return ancestorSets.reduce((common, ancestors) => {
          return new Set([...common].filter(x => ancestors.has(x)))
        })
      }
      
      const commonAncestors = findCommonAncestors(currentBranch.parentIds)
      const processedBranches = new Set<string>()
      
      // 공통 조상 메시지 먼저 추가
      const rootBranch = branches.find(b => b.id === 'root')
      if (rootBranch && commonAncestors.has('root')) {
        const rootMessages = rootBranch.messages || []
        if (rootMessages.length > 0) {
          messages.push(...rootMessages)
        }
        processedBranches.add('root')
      }
      
      // 머지 구분자 추가
      messages.push({
        id: `merge_divider_${currentBranch.id}`,
        content: `━━━ 머지 지점: ${currentBranch.parentIds.map(id => 
          branches.find(b => b.id === id)?.title || id
        ).join(' + ')} ━━━`,
        role: 'assistant',
        branchId: currentBranch.id,
        timestamp: new Date(),
      })
      
      // 각 부모 브랜치의 고유 메시지만 추가
      currentBranch.parentIds.forEach(parentId => {
        const parentBranch = branches.find(b => b.id === parentId)
        if (parentBranch && !processedBranches.has(parentId)) {
          const parentMessages = parentBranch.messages || []
          // 공통 조상이 아닌 메시지만 추가
          if (!commonAncestors.has(parentId) && parentMessages.length > 0) {
            messages.push({
              id: `parent_divider_${parentId}`,
              content: `[브랜치: ${parentBranch.title}]`,
              role: 'assistant',
              branchId: parentId,
              timestamp: parentMessages[0].timestamp,
            })
            messages.push(...parentMessages)
          }
          processedBranches.add(parentId)
        }
      })
      
      // 현재 머지 노드의 메시지 추가
      const currentMessages = currentBranch.messages || []
      if (currentMessages.length > 0) {
        messages.push({
          id: `current_divider_${currentBranch.id}`,
          content: `━━━ 머지 요약: ${currentBranch.title} ━━━`,
          role: 'assistant',
          branchId: currentBranch.id,
          timestamp: currentMessages[0]?.timestamp || new Date(),
        })
        messages.push(...currentMessages)
      }
    } 
    // 일반 노드의 경우 기존 로직 사용
    else {
      let current: Branch | undefined = currentBranch
      
      // 루트까지 거슬러 올라가며 브랜치 수집
      const ancestorBranches: Branch[] = []
      while (current) {
        ancestorBranches.unshift(current) // 부모부터 순서대로
        current = current.parentId 
          ? branches.find(b => b.id === current!.parentId)
          : undefined
      }
      
      // 각 브랜치의 메시지를 순서대로 추가
      ancestorBranches.forEach((ancestorBranch, index) => {
        // messages가 undefined인 경우 빈 배열로 처리
        const branchMessages = ancestorBranch.messages || []
        
        // 브랜치 전환 구분자 추가 (첫 브랜치 제외)
        if (index > 0 && branchMessages.length > 0) {
          messages.push({
            id: `divider_${ancestorBranch.id}`,
            content: `━━━ 브랜치: ${ancestorBranch.title} ━━━`,
            role: 'assistant',
            branchId: ancestorBranch.id,
            timestamp: branchMessages[0]?.timestamp || new Date(),
          })
        }
        
        // 해당 브랜치의 메시지 추가
        if (branchMessages.length > 0) {
          messages.push(...branchMessages)
        }
      })
    }
    
    return messages
  },
}))