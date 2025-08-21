import api from './api';
import { Node, CreateNodeRequest, UpdateNodeRequest } from '../types';

export const nodeService = {
  // 세션의 노드 목록 조회 (전체)
  async getNodes(sessionId: string) {
    const response = await api.get(`/api/v1/nodes/session/${sessionId}`);
    return response.data;
  },
  
  // 세션의 특정 노드의 자식 노드 조회
  async getNodeChildren(sessionId: string, parentId: string) {
    const response = await api.get(`/api/v1/nodes/session/${sessionId}/children/${parentId}`);
    return response.data;
  },
  
  // 세션의 노드 목록 페이지네이션 조회
  async getNodesPaginated(sessionId: string, skip: number = 0, limit: number = 10) {
    const response = await api.get(`/api/v1/nodes/session/${sessionId}/paginated`, {
      params: { skip, limit }
    });
    return response.data;
  },

  // 특정 노드 조회
  async getNode(nodeId: string) {
    const response = await api.get(`/api/v1/nodes/${nodeId}`);
    return response.data;
  },

  // 노드의 하위 노드 조회 (자손)
  async getChildNodes(nodeId: string) {
    const response = await api.get(`/api/v1/nodes/${nodeId}/descendants`);
    return response.data;
  },
  
  // 노드의 하위 노드 조회 (깊이 제한)
  async getChildNodesWithDepth(nodeId: string, maxDepth: number) {
    const response = await api.get(`/api/v1/nodes/${nodeId}/descendants/depth/${maxDepth}`);
    return response.data;
  },
  
  // 노드의 상위 노드 조회 (조상)
  async getAncestors(nodeId: string) {
    const response = await api.get(`/api/v1/nodes/${nodeId}/ancestors`);
    return response.data;
  },
  
  // 루트부터 노드까지의 경로 조회
  async getNodePath(nodeId: string) {
    const response = await api.get(`/api/v1/nodes/${nodeId}/path`);
    return response.data;
  },
  
  // 세션의 리프 노드들 조회
  async getLeafNodes(sessionId: string) {
    const response = await api.get(`/api/v1/nodes/session/${sessionId}/leaves`);
    return response.data;
  },
  
  // 노드와 조상들의 총 토큰 수 조회
  async getTotalTokens(nodeId: string): Promise<number> {
    const response = await api.get(`/api/v1/nodes/${nodeId}/tokens`);
    return response.data.total_tokens;
  },
  
  // 노드의 모든 관계 정보 조회
  async getNodeRelations(nodeId: string) {
    const response = await api.get(`/api/v1/nodes/${nodeId}/relations`);
    return response.data;
  },

  // 새 노드 생성
  async createNode(sessionId: string, data: CreateNodeRequest) {
    const response = await api.post(`/api/v1/nodes`, {
      ...data,
      session_id: sessionId
    });
    return response.data;
  },

  // 노드 업데이트
  async updateNode(nodeId: string, data: UpdateNodeRequest) {
    const response = await api.put(`/api/v1/nodes/${nodeId}`, data);
    return response.data;
  },

  // 노드 삭제 (단일 노드만)
  async deleteNode(nodeId: string) {
    const response = await api.delete(`/api/v1/nodes/${nodeId}`);
    return response.data;
  },
  
  // 노드 삭제 (하위 노드 포함)
  async deleteNodeCascade(nodeId: string) {
    const response = await api.delete(`/api/v1/nodes/${nodeId}/cascade`);
    return response.data;
  },
  
  // 여러 노드 삭제 (단일 노드만)
  async deleteMultipleNodes(nodeIds: string[]) {
    const response = await api.post('/api/v1/nodes/delete-multiple', {
      node_ids: nodeIds
    });
    return response.data;  // DeleteNodesResult 타입 반환
  },
  
  // 여러 노드 삭제 (하위 노드 포함)
  async deleteMultipleNodesCascade(nodeIds: string[]) {
    const response = await api.post('/api/v1/nodes/delete-multiple/cascade', {
      node_ids: nodeIds
    });
    return response.data;  // DeleteNodesResult 타입 반환
  },

  // 노드 요약
  async summarizeNode(nodeId: string) {
    const response = await api.post(`/api/v1/nodes/${nodeId}/summarize`);
    return response.data;
  },

  // 요약 노드 생성
  async createSummaryNode(nodeIds: string[], isManual?: boolean, summaryContent?: string) {
    const response = await api.post('/api/v1/nodes/summary', {
      node_ids: nodeIds,
      is_manual: isManual || false,
      summary_content: summaryContent
    });
    return response.data;
  },

  // 참조 노드 생성
  async createReferenceNode(nodeIds: string[], title?: string, content?: string) {
    const response = await api.post('/api/v1/nodes/reference', {
      node_ids: nodeIds,
      title: title,
      content: content
    });
    return response.data;
  }
};