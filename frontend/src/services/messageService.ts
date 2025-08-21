import api from './api';
import { Message, CreateMessageRequest, UpdateMessageRequest } from '../types';

export const messageService = {
  // 노드의 메시지 목록 조회
  async getMessages(nodeId: string) {
    const response = await api.get(`/api/v1/messages/node/${nodeId}`);
    return response.data;
  },

  // 특정 메시지 조회
  async getMessage(messageId: string) {
    const response = await api.get(`/api/v1/messages/${messageId}`);
    return response.data;
  },

  // 새 메시지 생성 (채팅)
  async createMessage(nodeId: string, data: CreateMessageRequest) {
    const response = await api.post(`/api/v1/messages`, {
      node_id: nodeId,
      ...data
    });
    return response.data;
  },

  // 메시지 업데이트
  async updateMessage(messageId: string, data: UpdateMessageRequest) {
    const response = await api.put(`/api/v1/messages/${messageId}`, data);
    return response.data;
  },

  // 메시지 삭제
  async deleteMessage(messageId: string) {
    const response = await api.delete(`/api/v1/messages/${messageId}`);
    return response.data;
  },

  // 대화 기록 조회 (부모 노드 포함)
  async getHistory(nodeId: string) {
    const response = await api.get(`/api/v1/messages/history/${nodeId}`);
    return response.data;
  },

  // 노드별 메시지 로드
  async loadMessagesForNode(nodeId: string): Promise<Message[]> {
    try {
      const messages = await this.getMessages(nodeId);
      // 백엔드 형식을 프론트엔드 형식으로 변환
      return messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        branchId: nodeId,
        timestamp: new Date(msg.timestamp || msg.created_at),
      }));
    } catch (error) {
      console.error(`노드 ${nodeId}의 메시지 로드 실패:`, error);
      return [];
    }
  },
};