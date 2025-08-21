export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  branchId: string
  node_id?: string  // 백엔드에서 오는 node_id 필드
  timestamp: Date
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
}