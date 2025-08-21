import { Message } from './message.types'

export type NodeType = 'root' | 'main' | 'topic' | 'exploration' | 'question' | 'solution' | 'summary' | 'reference'
export type NodeStatus = 'active' | 'paused' | 'completed'

export interface Node {
  id: string
  parentId?: string | null
  sessionId?: string
  sourceNodeIds?: string[] // 요약 노드의 경우 여러 소스 노드를 가짐
  title: string
  description?: string
  content?: string
  type: NodeType
  status?: NodeStatus
  messages?: Message[]
  depth?: number
  isActive?: boolean
  isSummary?: boolean // 요약 노드 여부
  isGenerating?: boolean // 생성 중 상태 (요약 생성 중 등)
  isMerge?: boolean
  isReference?: boolean
  tokenCount?: number // 사용한 토큰 수
  messageCount?: number
  summaryContent?: string // 핵심 내용 요약
  keyPoints?: string[] // 주요 포인트들
  charts?: { type: 'flow' | 'table' | 'list'; content: any }[] // 차트나 표 데이터
  edgeLabel?: string // 부모로부터의 관계 라벨
  position?: { x: number; y: number }
  color?: string
  createdAt?: Date // 노드 생성 시간
  updatedAt?: Date // 노드 업데이트 시간
  children?: string[] // 자식 노드 ID 목록
  metadata?: any // 추가 메타데이터
}

export interface EdgeLabels {
  [key: string]: string // key: "sourceId-targetId", value: label
}

// 이전 버전과의 호환성을 위한 타입 별칭 (임시)
export type Branch = Node