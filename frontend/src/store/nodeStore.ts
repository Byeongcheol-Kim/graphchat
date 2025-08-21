import { create } from 'zustand'
import { Node, NodeType, Message } from '@/types'
import { nodeService } from '@/services/nodeService'
import { getNodeDescendants } from '@/utils'
import { transformBackendNode } from '@/utils/nodeTransform'

interface NodeState {
  nodes: Node[]
  currentNodeId: string
  isLoading: boolean
  isSummarizing: boolean  // 요약 중 상태
  error: string | null
  
  // API 연동 메서드
  loadNodes: (sessionId: string) => Promise<void>
  loadNode: (nodeId: string) => Promise<void>
  loadChildNodes: (nodeId: string, maxDepth?: number) => Promise<void>
  loadAncestors: (nodeId: string) => Promise<void>
  loadNodePath: (nodeId: string) => Promise<Node[]>
  loadLeafNodes: (sessionId: string) => Promise<Node[]>
  getTotalTokens: (nodeId: string) => Promise<number>
  
  // 기존 메서드
  setNodes: (nodes: Node[]) => void
  setCurrentNodeId: (id: string) => void
  addNode: (node: Node) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  
  // API 연동 노드 생성/수정/삭제
  createNode: (sessionId: string, parentId: string, title: string, type: NodeType) => Promise<string>
  createIndependentNode: (sessionId: string, title?: string) => Promise<string>
  createSummaryNode: (sessionId: string, nodeIds: string[], instructions?: string) => Promise<string | null>
  createReferenceNode: (sessionId: string, nodeIds: string[]) => Promise<string | null>
  deleteNodes: (nodeIds: string[], includeDescendants?: boolean) => Promise<void>
  summarizeNode: (nodeId: string) => Promise<void>
  
  addMessageToNode: (nodeId: string, message: Message) => void
  createNewSession: () => void
}

export const useNodeStore = create<NodeState>((set, get) => ({
  nodes: [],
  currentNodeId: 'root',
  isLoading: false,
  isSummarizing: false,
  error: null,
  
  // 세션의 노드 목록 로드
  loadNodes: async (sessionId: string) => {
    set({ isLoading: true, error: null })
    try {
      const rawNodes = await nodeService.getNodes(sessionId)
      
      // 백엔드 데이터를 프론트엔드 형식으로 변환
      const nodes = rawNodes.map((node: any) => transformBackendNode(node))
      
      set({ nodes, isLoading: false })
      
      // 브랜치 추천을 백엔드에서 가져와서 복원
      try {
        const { recommendationService } = await import('@/services/recommendationService')
        const { useRecommendationStore } = await import('./recommendationStore')
        const recommendationStore = useRecommendationStore.getState()
        
        const allRecommendations = await recommendationService.getSessionRecommendations(sessionId)
        
        // 노드별로 추천 복원
        for (const [nodeId, recommendations] of Object.entries(allRecommendations)) {
          if (recommendations && recommendations.length > 0) {
            // 백엔드 형식을 프론트엔드 형식으로 변환
            const frontendRecommendations = recommendations.map(rec => ({
              id: rec.id,
              title: rec.title,
              description: rec.description,
              type: rec.type,
              priority: rec.priority,
              estimated_depth: rec.estimated_depth,
              edge_label: rec.edge_label,
              status: rec.status,
              created_branch_id: rec.created_branch_id
            }))
            
            // 해당 노드의 메시지 개수 찾기
            const node = nodes.find((n: Node) => n.id === nodeId)
            const messageCount = node?.messageCount || 0
            
            recommendationStore.setRecommendations(nodeId, frontendRecommendations, messageCount)
            console.log(`[nodeStore] 노드 ${nodeId}에 ${recommendations.length}개의 브랜치 추천 복원`)
          }
        }
      } catch (error) {
        console.error('[nodeStore] 브랜치 추천 복원 실패:', error)
        // 실패해도 계속 진행
      }
      
      // 루트 노드 찾아서 현재 노드로 설정
      const rootNode = nodes.find((n: Node) => !n.parentId)
      if (rootNode) {
        set({ currentNodeId: rootNode.id })
        
        // 루트 노드의 메시지 로드
        const { messageService } = await import('@/services/messageService')
        const messages = await messageService.loadMessagesForNode(rootNode.id)
        
        // messageStore에 메시지 설정
        const { useMessageStore } = await import('./messageStore')
        useMessageStore.getState().setMessages(messages)
      }
      
      // 모든 노드의 메시지 로드 (백그라운드)
      const { messageService } = await import('@/services/messageService')
      for (const node of nodes) {
        if (node.id !== rootNode?.id) {
          // 비동기로 메시지 로드
          messageService.loadMessagesForNode(node.id).then(messages => {
            if (messages.length > 0) {
              // 직접 addMessageToNode 호출 (순환 참조 방지)
              messages.forEach(msg => {
                get().addMessageToNode(node.id, msg)
              })
            }
          })
        }
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 특정 노드 로드
  loadNode: async (nodeId: string) => {
    set({ isLoading: true, error: null })
    try {
      const node = await nodeService.getNode(nodeId)
      set((state) => ({
        nodes: state.nodes.map(n => n.id === nodeId ? node : n),
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 자식 노드 로드 (하위 노드들)
  loadChildNodes: async (nodeId: string, maxDepth?: number) => {
    set({ isLoading: true, error: null })
    try {
      const rawChildren = maxDepth 
        ? await nodeService.getChildNodesWithDepth(nodeId, maxDepth)
        : await nodeService.getChildNodes(nodeId)
      const children = rawChildren.map((node: any) => transformBackendNode(node))
      
      set((state) => {
        const existingIds = new Set(state.nodes.map(n => n.id))
        const newChildren = children.filter((c: Node) => !existingIds.has(c.id))
        return {
          nodes: [...state.nodes, ...newChildren],
          isLoading: false
        }
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  setNodes: (nodes) => {
    set({ nodes })
  },
  
  setCurrentNodeId: (id) => {
    set({ currentNodeId: id })
  },
  
  addNode: (node) => {
    set((state) => {
      // 중복 체크: 이미 존재하는 노드면 추가하지 않음
      if (state.nodes.some(n => n.id === node.id)) {
        return state
      }
      return {
        nodes: [...state.nodes, node]
      }
    })
  },
  
  updateNode: (id, updates) => {
    // 날짜 필드가 있으면 Date 객체로 변환
    const updatesWithDates = {
      ...updates,
      ...(updates.createdAt && { createdAt: new Date(updates.createdAt) }),
      ...(updates.updatedAt && { updatedAt: new Date(updates.updatedAt) }),
    }
    set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === id ? { ...n, ...updatesWithDates } : n
      )
    }))
  },
  
  deleteNode: (id) => {
    set((state) => {
      const newNodes = state.nodes.filter(n => n.id !== id)
      
      // 현재 노드가 삭제되면 다른 노드를 선택
      let newCurrentId = state.currentNodeId
      if (state.currentNodeId === id) {
        // 부모 노드 찾기
        const deletedNode = state.nodes.find(n => n.id === id)
        if (deletedNode?.parentId) {
          newCurrentId = deletedNode.parentId
        } else if (newNodes.length > 0) {
          // 루트 노드나 첫 번째 노드 선택
          const rootNode = newNodes.find(n => !n.parentId)
          newCurrentId = rootNode?.id || newNodes[0].id
        } else {
          newCurrentId = null
        }
      }
      
      return {
        nodes: newNodes,
        currentNodeId: newCurrentId
      }
    })
  },
  
  // API를 통한 노드 생성
  createNode: async (sessionId: string, parentId: string, title: string, type: NodeType) => {
    set({ isLoading: true, error: null })
    try {
      const node = await nodeService.createNode(sessionId, {
        parent_id: parentId,
        type: type,  // 이제 타입 변환 불필요
        title,
        content: ''
      })
      
      get().addNode(node)
      set({ isLoading: false })
      return node.id
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  // 독립 노드 생성
  createIndependentNode: async (sessionId: string, title?: string) => {
    return get().createNode(sessionId, '', title || '독립 노드', 'topic')  // 'general'을 'topic'으로 변경
  },
  
  // 요약 노드 생성
  createSummaryNode: async (sessionId: string, nodeIds: string[], instructions?: string) => {
    if (nodeIds.length === 0) return null
    
    set({ isSummarizing: true, error: null })  // 요약 중 상태 설정
    try {
      // 백엔드의 요약 노드 생성 API 호출 (즉시 플레이스홀더 노드 반환)
      const rawNode = await nodeService.createSummaryNode(
        nodeIds,
        !!instructions,  // instructions가 있으면 수동 요약
        instructions
      )
      
      // 백엔드 데이터를 프론트엔드 형식으로 변환
      const node = transformBackendNode(rawNode)
      
      // 노드 추가 및 현재 노드로 설정 (로딩 상태로)
      get().addNode(node)
      set({ currentNodeId: node.id })  // 즉시 노드 선택
      
      // 요약이 생성 중인 경우에만 isSummarizing 유지
      if (node.isGenerating) {
        // WebSocket이나 폴링으로 업데이트 대기
        set({ isSummarizing: true })
      } else {
        set({ isSummarizing: false })
      }
      
      return node.id
    } catch (error: any) {
      set({ error: error.message, isSummarizing: false })
      return null
    }
  },
  
  // 참조 노드 생성
  createReferenceNode: async (sessionId: string, nodeIds: string[]) => {
    if (nodeIds.length === 0) return null
    
    set({ isLoading: true, error: null })
    try {
      // 백엔드의 참조 노드 생성 API 호출
      const rawNode = await nodeService.createReferenceNode(nodeIds)
      
      const node = transformBackendNode(rawNode)
      get().addNode(node)
      set({ isLoading: false, currentNodeId: node.id })  // 생성된 노드를 현재 노드로 설정
      return node.id
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },
  
  // 노드 삭제 (백엔드에서 처리)
  deleteNodes: async (nodeIds: string[], includeDescendants: boolean = true) => {
    set({ isLoading: true, error: null })
    try {
      if (nodeIds.length === 0) {
        set({ isLoading: false })
        return
      }
      
      // 백엔드에서 한 번에 삭제 및 자손 노드 처리
      const result = includeDescendants
        ? await nodeService.deleteMultipleNodesCascade(nodeIds)
        : await nodeService.deleteMultipleNodes(nodeIds)
      
      if (result.success) {
        // 백엔드에서 반환한 삭제된 노드 ID들 사용
        const allToDelete = new Set<string>(result.deleted_node_ids)
        
        // 한 번에 모든 노드 삭제 및 currentNodeId 업데이트
        set((state) => {
          const oldNodesCount = state.nodes.length
          const newNodes = state.nodes.filter(n => !allToDelete.has(n.id))
          
          // 현재 노드가 삭제되면 다른 노드를 선택
          let newCurrentId = state.currentNodeId
          if (state.currentNodeId && allToDelete.has(state.currentNodeId)) {
            // 삭제되지 않은 노드 중에서 선택
            if (newNodes.length > 0) {
              // 루트 노드나 첫 번째 노드 선택
              const rootNode = newNodes.find(n => !n.parentId)
              newCurrentId = rootNode?.id || newNodes[0].id
            } else {
              newCurrentId = null
            }
          }
          
          console.log('[nodeStore] deleteNodes 완료:')
          console.log('- 이전 노드 수:', oldNodesCount)
          console.log('- 삭제된 노드 수:', allToDelete.size)
          console.log('- 남은 노드 수:', newNodes.length)
          console.log('- 남은 노드 ID:', newNodes.map(n => n.id))
          
          return {
            nodes: newNodes,
            currentNodeId: newCurrentId,
            isLoading: false
          }
        })
      } else {
        set({ error: result.message || '노드 삭제 실패', isLoading: false })
      }
      
      // 삭제 성공 후에는 이미 상태가 업데이트되었으므로 추가 로드 불필요
      // loadNodes를 호출하면 오히려 상태가 꼬일 수 있음
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 노드 요약
  summarizeNode: async (nodeId: string) => {
    set({ isLoading: true, error: null })
    try {
      const summary = await nodeService.summarizeNode(nodeId)
      // 요약 결과로 노드 업데이트
      get().updateNode(nodeId, { summary: summary.content })
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  addMessageToNode: (nodeId, message) => {
    set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === nodeId 
          ? { ...n, messages: [...(n.messages || []), message] }
          : n
      )
    }))
  },
  
  createNewSession: () => {
    // 세션 생성은 sessionStore에서 처리
    set({ 
      nodes: [],
      currentNodeId: 'root'
    })
  },
  
  // 상위 노드 로드 (조상)
  loadAncestors: async (nodeId: string) => {
    set({ isLoading: true, error: null })
    try {
      const rawAncestors = await nodeService.getAncestors(nodeId)
      const ancestors = rawAncestors.map((node: any) => transformBackendNode(node))
      
      set((state) => {
        const existingIds = new Set(state.nodes.map(n => n.id))
        const newAncestors = ancestors.filter((a: Node) => !existingIds.has(a.id))
        return {
          nodes: [...state.nodes, ...newAncestors],
          isLoading: false
        }
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 노드 경로 로드
  loadNodePath: async (nodeId: string) => {
    try {
      const rawPath = await nodeService.getNodePath(nodeId)
      const path = rawPath.map((node: any) => transformBackendNode(node))
      
      set((state) => {
        const existingIds = new Set(state.nodes.map(n => n.id))
        const newNodes = path.filter((n: Node) => !existingIds.has(n.id))
        if (newNodes.length > 0) {
          return { nodes: [...state.nodes, ...newNodes] }
        }
        return state
      })
      
      return path
    } catch (error: any) {
      console.error('노드 경로 로드 실패:', error)
      return []
    }
  },
  
  // 리프 노드 로드
  loadLeafNodes: async (sessionId: string) => {
    try {
      const rawLeaves = await nodeService.getLeafNodes(sessionId)
      const leaves = rawLeaves.map((node: any) => transformBackendNode(node))
      
      set((state) => {
        const existingIds = new Set(state.nodes.map(n => n.id))
        const newLeaves = leaves.filter((l: Node) => !existingIds.has(l.id))
        if (newLeaves.length > 0) {
          return { nodes: [...state.nodes, ...newLeaves] }
        }
        return state
      })
      
      return leaves
    } catch (error: any) {
      console.error('리프 노드 로드 실패:', error)
      return []
    }
  },
  
  // 토큰 수 계산
  getTotalTokens: async (nodeId: string) => {
    try {
      const totalTokens = await nodeService.getTotalTokens(nodeId)
      return totalTokens
    } catch (error: any) {
      console.error('토큰 수 조회 실패:', error)
      return 0
    }
  },
}))