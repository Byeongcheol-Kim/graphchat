import api from './api';
import { Session, CreateSessionRequest, UpdateSessionRequest } from '../types';

export const sessionService = {
  // 세션 목록 조회
  async getSessions(skip = 0, limit = 10) {
    const response = await api.get('/api/v1/sessions', {
      params: { skip, limit }
    });
    return response.data;
  },

  // 특정 세션 조회
  async getSession(sessionId: string) {
    const response = await api.get(`/api/v1/sessions/${sessionId}`);
    return response.data;
  },

  // 새 세션 생성
  async createSession(data: CreateSessionRequest) {
    const response = await api.post('/api/v1/sessions', data);
    return response.data;
  },

  // 세션 업데이트
  async updateSession(sessionId: string, data: UpdateSessionRequest) {
    const response = await api.put(`/api/v1/sessions/${sessionId}`, data);
    return response.data;
  },

  // 세션 삭제
  async deleteSession(sessionId: string) {
    const response = await api.delete(`/api/v1/sessions/${sessionId}`);
    return response.data;
  }
};