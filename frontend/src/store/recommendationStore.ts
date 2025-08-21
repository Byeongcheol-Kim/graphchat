import { create } from 'zustand'

interface BranchRecommendation {
  title: string
  type: string
  description: string
  priority: number
  estimated_depth: number
  edge_label: string
}

interface RecommendationData {
  recommendations: BranchRecommendation[]
  messageCount: number  // 추천이 생성됐을 때의 메시지 개수
  isStale?: boolean  // 오래된 추천인지 표시
}

interface RecommendationState {
  // 노드별 브랜치 추천 저장 (nodeId -> RecommendationData)
  recommendations: Record<string, RecommendationData>
  
  // 숨긴 추천 목록 (nodeId 집합)
  dismissedNodes: Set<string>
  
  // 액션
  setRecommendations: (nodeId: string, recommendations: BranchRecommendation[], messageCount: number) => void
  clearRecommendations: (nodeId: string) => void
  dismissRecommendations: (nodeId: string) => void
  isRecommendationDismissed: (nodeId: string) => boolean
  getRecommendations: (nodeId: string, currentMessageCount?: number) => BranchRecommendation[]
  markAsStale: (nodeId: string) => void
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  recommendations: {},
  dismissedNodes: new Set(),
  
  setRecommendations: (nodeId: string, recommendations: BranchRecommendation[], messageCount: number) => {
    set((state) => {
      // 이전 추천이 있으면 오래된 것으로 표시
      const prevData = state.recommendations[nodeId]
      if (prevData && prevData.messageCount < messageCount) {
        prevData.isStale = true
      }
      
      return {
        recommendations: {
          ...state.recommendations,
          [nodeId]: {
            recommendations,
            messageCount,
            isStale: false
          }
        },
        // 새 추천이 오면 숨김 상태 해제
        dismissedNodes: new Set(Array.from(state.dismissedNodes).filter(id => id !== nodeId))
      }
    })
  },
  
  clearRecommendations: (nodeId: string) => {
    set((state) => {
      const newRecommendations = { ...state.recommendations }
      delete newRecommendations[nodeId]
      return { recommendations: newRecommendations }
    })
  },
  
  dismissRecommendations: (nodeId: string) => {
    set((state) => ({
      dismissedNodes: new Set(state.dismissedNodes).add(nodeId)
    }))
  },
  
  isRecommendationDismissed: (nodeId: string) => {
    return get().dismissedNodes.has(nodeId)
  },
  
  getRecommendations: (nodeId: string, currentMessageCount?: number) => {
    const data = get().recommendations[nodeId]
    if (!data) return []
    
    // 현재 메시지 개수가 추천 생성 시점보다 많으면 오래된 추천
    if (currentMessageCount && currentMessageCount > data.messageCount) {
      // 오래된 추천은 빈 배열 반환 (표시하지 않음)
      return []
    }
    
    return data.recommendations
  },
  
  markAsStale: (nodeId: string) => {
    set((state) => {
      const data = state.recommendations[nodeId]
      if (data) {
        data.isStale = true
      }
      return { recommendations: { ...state.recommendations } }
    })
  }
}))