// 이전 버전과의 호환성을 위한 래퍼
// 실제 로직은 nodeStore에 있음
import { create } from 'zustand'
import { Branch } from '@/types'

// nodeStore와 sessionStore는 동적으로 import하여 순환 참조 방지
let nodeStoreModule: any = null
let sessionStoreModule: any = null

const getNodeStore = async () => {
  if (!nodeStoreModule) {
    nodeStoreModule = await import('./nodeStore')
  }
  return nodeStoreModule.useNodeStore
}

const getSessionStore = async () => {
  if (!sessionStoreModule) {
    sessionStoreModule = await import('./sessionStore')
  }
  return sessionStoreModule.useSessionStore
}

// Zustand selector 패턴을 위한 새로운 store
interface BranchStoreState {
  branches: Branch[]
  currentBranchId: string
  setBranches: (branches: Branch[]) => Promise<void>
  setCurrentBranchId: (id: string) => Promise<void>
  addBranch: (branch: Branch) => Promise<void>
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>
  deleteBranch: (id: string) => Promise<void>
  createBranch: (parentId: string, title: string, type: any) => Promise<string | null>
  createIndependentNode: (title?: string) => Promise<string | null>
  createSummaryNode: (nodeIds: string[], instructions?: string) => Promise<string | null>
  createReferenceNode: (nodeIds: string[]) => Promise<string | null>
  deleteNodes: (nodeIds: string[], includeDescendants?: boolean) => Promise<boolean>
  addMessageToBranch: (branchId: string, message: any) => Promise<void>
  initializeWithDummyData: () => void
  createNewSession: () => Promise<void>
}

export const useBranchStore = create<BranchStoreState>((set, get) => {
  // 비동기로 nodeStore 구독 설정 (단, 초기 상태는 즉시 반환)
  const setupSubscription = async () => {
    try {
      const useNodeStore = await getNodeStore()
      
      // nodeStore 구독 및 동기화 - 실시간 동기화 보장
      useNodeStore.subscribe((state: any) => {
        console.log('[branchStore] nodeStore 변경 감지:')
        console.log('- 노드 수:', state.nodes.length)
        console.log('- 노드 ID:', state.nodes.map((n: any) => n.id))
        
        // 상태만 업데이트 (함수는 유지)
        set((prev) => ({
          ...prev,  // 기존 함수들 유지
          branches: [...state.nodes] as Branch[], // 새 배열 참조로 React 리렌더링 보장
          currentBranchId: state.currentNodeId,
        }))
      })
      
      // 초기 상태 동기화
      const initialNodeStore = useNodeStore.getState()
      set((prev) => ({
        ...prev,  // 기존 함수들 유지
        branches: initialNodeStore.nodes as Branch[],
        currentBranchId: initialNodeStore.currentNodeId,
      }))
    } catch (error) {
      console.error('[branchStore] 초기화 중 에러:', error)
    }
  }
  
  // 비동기로 구독 설정 실행 (즉시 return하기 위해 await 사용 안함)
  setupSubscription()
  
  const storeObject = {
    // 상태 - 초기값은 nodeStore의 현재 상태로 설정
    branches: [] as Branch[],
    currentBranchId: '',
    
    // 메서드 - 동적으로 nodeStore 메서드 호출
    setBranches: async (branches: Branch[]) => {
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.setNodes) {
        nodeStore.setNodes(branches)
      }
    },
    
    setCurrentBranchId: async (id: string) => {
      try {
        const useNodeStore = await getNodeStore()
        const nodeStore = useNodeStore.getState()
        if (nodeStore.setCurrentNodeId) {
          nodeStore.setCurrentNodeId(id)
        } else {
          console.error('[branchStore.setCurrentBranchId] nodeStore.setCurrentNodeId가 없음')
        }
      } catch (error) {
        console.error('[branchStore.setCurrentBranchId] 에러:', error)
      }
    },
    
    addBranch: async (branch: Branch) => {
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.addNode) {
        nodeStore.addNode(branch)
      }
    },
    
    updateBranch: async (id: string, updates: Partial<Branch>) => {
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.updateNode) {
        nodeStore.updateNode(id, updates)
      }
    },
    
    deleteBranch: async (id: string) => {
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.deleteNode) {
        nodeStore.deleteNode(id)
      }
    },
    
    createBranch: async (parentId: string, title: string, type: any) => {
      const useSessionStore = await getSessionStore()
      const currentSession = useSessionStore.getState().currentSession
      if (!currentSession) {
        console.error('No active session')
        return null
      }
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.createNode) {
        return nodeStore.createNode(currentSession.id, parentId, title, type)
      }
      return null
    },
    
    createIndependentNode: async (title?: string) => {
      const useSessionStore = await getSessionStore()
      const currentSession = useSessionStore.getState().currentSession
      if (!currentSession) {
        console.error('No active session')
        return null
      }
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.createIndependentNode) {
        return nodeStore.createIndependentNode(currentSession.id, title)
      }
      return null
    },
    
    createSummaryNode: async (nodeIds: string[], instructions?: string) => {
      const useSessionStore = await getSessionStore()
      const currentSession = useSessionStore.getState().currentSession
      if (!currentSession) {
        console.error('No active session')
        return null
      }
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.createSummaryNode) {
        return nodeStore.createSummaryNode(currentSession.id, nodeIds, instructions)
      }
      return null
    },
    
    createReferenceNode: async (nodeIds: string[]) => {
      const useSessionStore = await getSessionStore()
      const currentSession = useSessionStore.getState().currentSession
      if (!currentSession) {
        console.error('No active session')
        return null
      }
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.createReferenceNode) {
        return nodeStore.createReferenceNode(currentSession.id, nodeIds)
      }
      return null
    },
    
    deleteNodes: async (nodeIds: string[], includeDescendants: boolean = true) => {
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.deleteNodes) {
        return nodeStore.deleteNodes(nodeIds, includeDescendants)
      }
      return false
    },
    
    addMessageToBranch: async (branchId: string, message: any) => {
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.addMessageToNode) {
        nodeStore.addMessageToNode(branchId, message)
      }
    },
    
    // 더 이상 더미 데이터를 사용하지 않음
    initializeWithDummyData: () => {
      console.log('Dummy data initialization is deprecated. Use real sessions instead.')
    },
    
    createNewSession: async () => {
      const useSessionStore = await getSessionStore()
      const sessionStore = useSessionStore.getState()
      await sessionStore.createSession('새로운 세션', '새로 생성된 대화 세션')
      const useNodeStore = await getNodeStore()
      const nodeStore = useNodeStore.getState()
      if (nodeStore.createNewSession) {
        nodeStore.createNewSession()
      }
    },
  }
  
  return storeObject
})