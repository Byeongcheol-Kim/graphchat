import api from './api'

export interface BranchRecommendation {
  id: string
  message_id: string
  node_id: string
  session_id: string
  title: string
  description: string
  type: string
  priority: number
  estimated_depth: number
  edge_label: string
  status: 'pending' | 'created' | 'dismissed' | 'expired'
  created_branch_id?: string
  created_at: string
  updated_at?: string
  dismissed_at?: string
}

export const recommendationService = {
  // 세션의 모든 활성 추천 조회
  async getSessionRecommendations(sessionId: string): Promise<Record<string, BranchRecommendation[]>> {
    const response = await api.get(`/api/v1/recommendations/session/${sessionId}`)
    return response.data
  },

  // 특정 노드의 추천 조회
  async getNodeRecommendations(nodeId: string, status?: string): Promise<BranchRecommendation[]> {
    const params = status ? { status } : {}
    const response = await api.get(`/api/v1/recommendations/node/${nodeId}`, { params })
    return response.data
  },

  // 특정 메시지의 추천 조회
  async getMessageRecommendations(messageId: string): Promise<BranchRecommendation[]> {
    const response = await api.get(`/api/v1/recommendations/message/${messageId}`)
    return response.data
  },

  // 브랜치 생성 완료 표시
  async markAsCreated(recommendationId: string, createdBranchId: string): Promise<BranchRecommendation> {
    const response = await api.post(`/api/v1/recommendations/${recommendationId}/create-branch`, null, {
      params: { created_branch_id: createdBranchId }
    })
    return response.data
  },

  // 추천 무시
  async dismissRecommendation(recommendationId: string): Promise<BranchRecommendation> {
    const response = await api.post(`/api/v1/recommendations/${recommendationId}/dismiss`)
    return response.data
  },

  // 추천 상태 업데이트
  async updateRecommendation(
    recommendationId: string, 
    update: { 
      status?: string, 
      created_branch_id?: string,
      dismissed_at?: string 
    }
  ): Promise<BranchRecommendation> {
    const response = await api.patch(`/api/v1/recommendations/${recommendationId}`, update)
    return response.data
  }
}