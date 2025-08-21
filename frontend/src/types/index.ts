export * from './message.types'
export * from './node.types'
export * from './settings.types'

// Session types
export interface Session {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface CreateSessionRequest {
  title: string
  description?: string
  metadata?: Record<string, any>
}

export interface UpdateSessionRequest {
  title?: string
  description?: string
  metadata?: Record<string, any>
}

// Node request types
export interface CreateNodeRequest {
  parent_id?: string
  type: string  // 백엔드 스키마와 일치하도록 수정
  title: string  // 백엔드에서 필수 필드
  content?: string
  metadata?: Record<string, any>
}

export interface UpdateNodeRequest {
  title?: string
  content?: string
  metadata?: Record<string, any>
  status?: string
}

// Message request types  
export interface CreateMessageRequest {
  content: string
  role: 'user' | 'assistant' | 'system'
  metadata?: Record<string, any>
}

export interface UpdateMessageRequest {
  content?: string
  metadata?: Record<string, any>
}

// History types
export interface HistoryState {
  nodes: import('./node.types').Node[]
  currentNodeId: string
  messages: import('./message.types').Message[]
  edgeLabels: import('./node.types').EdgeLabels
}

// 이전 버전과의 호환성을 위한 re-export
export type { Branch } from './node.types'
export type { NodeType as BranchType, NodeStatus as BranchStatus } from './node.types'