import { create } from 'zustand'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  branchId: string
  timestamp: Date
}

export interface Branch {
  id: string
  parentId: string | null
  parentIds?: string[] // 머지 노드의 경우 여러 부모를 가짐
  title: string
  description: string
  type: 'main' | 'topic' | 'exploration' | 'question' | 'solution' | 'merge'
  status: 'active' | 'paused' | 'completed'
  messages: Message[]
  depth: number
  position?: { x: number; y: number }
  color?: string
  isMerge?: boolean // 머지 노드 여부
  tokenCount?: number // 사용한 토큰 수
  summary?: string // 핵심 내용 요약
  keyPoints?: string[] // 주요 포인트들
  charts?: { type: 'flow' | 'table' | 'list'; content: any }[] // 차트나 표 데이터
  edgeLabel?: string // 부모로부터의 관계 라벨
  createdAt?: Date // 노드 생성 시간
  updatedAt?: Date // 노드 업데이트 시간
}

interface HistoryState {
  branches: Branch[]
  currentBranchId: string
  messages: Message[]
  edgeLabels: EdgeLabels
}

interface EdgeLabels {
  [key: string]: string // key: "sourceId-targetId", value: label
}

interface Settings {
  darkMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  aiModel: 'gpt-4' | 'gpt-3.5' | 'claude-3' | 'gemini-pro' | 'llama-2'
}

interface ConversationState {
  branches: Branch[]
  currentBranchId: string
  messages: Message[]
  edgeLabels: EdgeLabels
  sessionName: string
  settings: Settings
  
  // History
  history: HistoryState[]
  historyIndex: number
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  switchBranch: (branchId: string) => void
  createBranch: (parentId: string, title: string, type: Branch['type']) => void
  initializeWithDummyData: () => void
  createNewSession: () => void
  createSummaryNode: (nodeIds: string[], instructions?: string) => string | null
  createReferenceNode: (nodeIds: string[]) => string | null
  deleteNodes: (nodeIds: string[]) => void
  updateEdgeLabel: (edgeId: string, label: string) => void
  updateSessionName: (name: string) => void
  updateSettings: (settings: Partial<Settings>) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

// 더미 데이터 생성 함수
const generateDummyData = (): Branch[] => {
  const branches: Branch[] = [
    {
      id: 'root',
      parentId: null,
      title: '시작',
      description: '대화의 시작점',
      type: 'main',
      status: 'completed',
      depth: 0,
      tokenCount: 245,
      summary: 'AI 윤리와 기술 구현에 대한 논의 시작',
      keyPoints: ['AI 윤리 문제 제기', '기술적 구현 방법 탐구', '두 가지 방향 제시'],
      createdAt: new Date('2024-01-01T10:00:00'),
      updatedAt: new Date('2024-01-01T10:01:00'),
      messages: [
        {
          id: 'm1',
          content: 'AI의 윤리적 문제와 기술적 구현에 대해 논의하고 싶습니다.',
          role: 'user',
          branchId: 'root',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          id: 'm2',
          content: '흥미로운 주제네요! AI 윤리와 기술 구현은 서로 다른 관점에서 접근할 수 있는 주제입니다. 각각 별도로 탐구해보시겠습니까?',
          role: 'assistant',
          branchId: 'root',
          timestamp: new Date('2024-01-01T10:01:00'),
        },
      ],
    },
    {
      id: 'ethics',
      parentId: 'root',
      title: 'AI 윤리',
      description: 'AI의 윤리적 문제와 사회적 영향',
      type: 'topic',
      status: 'active',
      depth: 1,
      color: '#9C27B0',
      tokenCount: 523,
      summary: 'AI 시스템의 편향성, 투명성, 프라이버시, 책임소재 문제 분석',
      keyPoints: ['편향성과 공정성', '투명성과 설명가능성', '프라이버시 보호', '책임소재 명확화'],
      createdAt: new Date('2024-01-01T10:02:00'),
      updatedAt: new Date('2024-01-01T10:03:00'),
      charts: [
        {
          type: 'list',
          content: ['편향성 문제', '투명성 문제', '프라이버시', '책임소재']
        }
      ],
      messages: [
        {
          id: 'm3',
          content: 'AI 윤리에서 가장 중요한 이슈는 무엇인가요?',
          role: 'user',
          branchId: 'ethics',
          timestamp: new Date('2024-01-01T10:02:00'),
        },
        {
          id: 'm4',
          content: 'AI 윤리의 핵심 이슈들:\n\n1. **편향성과 공정성**: AI 시스템이 학습 데이터의 편견을 반영\n2. **투명성과 설명가능성**: AI 결정 과정의 블랙박스 문제\n3. **프라이버시**: 개인정보 수집과 활용의 경계\n4. **책임소재**: AI 결정의 책임 귀속 문제',
          role: 'assistant',
          branchId: 'ethics',
          timestamp: new Date('2024-01-01T10:03:00'),
        },
      ],
    },
    {
      id: 'technical',
      parentId: 'root',
      title: '기술적 구현',
      description: 'AI 시스템의 기술적 구현 방법',
      type: 'topic',
      status: 'active',
      depth: 1,
      color: '#4FC3F7',
      tokenCount: 687,
      summary: 'LLM 구현에 필요한 핵심 기술 스택과 아키텍처',
      keyPoints: ['Transformer 아키텍처', '분산 학습 시스템', '토크나이저 구현', '최적화 기법'],
      createdAt: new Date('2024-01-01T10:02:30'),
      updatedAt: new Date('2024-01-01T10:03:30'),
      charts: [
        {
          type: 'flow',
          content: 'Input → Tokenizer → Transformer → Output'
        }
      ],
      messages: [
        {
          id: 'm5',
          content: '대규모 언어 모델을 구현하려면 어떤 기술이 필요한가요?',
          role: 'user',
          branchId: 'technical',
          timestamp: new Date('2024-01-01T10:02:00'),
        },
        {
          id: 'm6',
          content: 'LLM 구현에 필요한 핵심 기술:\n\n1. **Transformer 아키텍처**: Self-attention 메커니즘\n2. **분산 학습**: 여러 GPU/TPU를 활용한 병렬 처리\n3. **토크나이저**: 텍스트를 토큰으로 변환\n4. **최적화 기법**: Adam, AdamW 등의 옵티마이저',
          role: 'assistant',
          branchId: 'technical',
          timestamp: new Date('2024-01-01T10:03:00'),
        },
      ],
    },
    {
      id: 'bias',
      parentId: 'ethics',
      title: '편향성 문제',
      description: 'AI의 편향성과 해결 방안',
      type: 'question',
      status: 'active',
      depth: 2,
      color: '#FFC107',
      tokenCount: 156,
      summary: '편향성 탐지와 완화 방법론',
      keyPoints: ['데이터 편향 분석', '알고리즘 공정성', '평가 메트릭'],
      messages: [
        {
          id: 'm7',
          content: 'AI의 편향성을 어떻게 탐지하고 완화할 수 있을까요?',
          role: 'user',
          branchId: 'bias',
          timestamp: new Date('2024-01-01T10:04:00'),
        },
      ],
    },
    {
      id: 'transformer',
      parentId: 'technical',
      title: 'Transformer 아키텍처',
      description: 'Transformer 모델의 세부 구현',
      type: 'exploration',
      status: 'active',
      depth: 2,
      color: '#4CAF50',
      tokenCount: 234,
      summary: 'Self-attention 메커니즘 상세 분석',
      keyPoints: ['Multi-head attention', 'Positional encoding', 'Feed-forward networks'],
      messages: [
        {
          id: 'm8',
          content: 'Self-attention 메커니즘을 자세히 설명해주세요.',
          role: 'user',
          branchId: 'transformer',
          timestamp: new Date('2024-01-01T10:04:00'),
        },
      ],
    },
    {
      id: 'privacy',
      parentId: 'ethics',
      title: '프라이버시',
      description: '개인정보 보호와 AI',
      type: 'topic',
      status: 'paused',
      depth: 2,
      color: '#FF5722',
      messages: [],
    },
    {
      id: 'optimization',
      parentId: 'technical',
      title: '최적화 기법',
      description: '모델 학습 최적화',
      type: 'exploration',
      status: 'paused',
      depth: 2,
      color: '#00BCD4',
      messages: [],
    },
    {
      id: 'merge1',
      parentId: null, // 기본 부모는 null
      parentIds: ['bias', 'transformer'], // 실제 부모들
      title: '통합 분석',
      description: '편향성과 기술적 구현의 교집합',
      type: 'merge',
      status: 'active',
      depth: 3,
      color: '#E91E63',
      isMerge: true,
      tokenCount: 892,
      summary: '기술 설계 단계에서 편향성 완화 방법 통합',
      keyPoints: ['Attention 메커니즘 조정', 'Debiasing layer 추가', 'Fairness constraints'],
      createdAt: new Date('2024-01-01T10:05:00'),
      updatedAt: new Date('2024-01-01T10:06:00'),
      charts: [
        {
          type: 'table',
          content: [['방법', '효과'], ['Debiasing Layer', '85%'], ['Fairness Constraint', '72%']]
        }
      ],
      messages: [
        {
          id: 'm9',
          content: '편향성 문제와 Transformer 아키텍처를 함께 고려하면, 모델 설계 단계에서부터 공정성을 반영할 수 있습니다.',
          role: 'assistant',
          branchId: 'merge1',
          timestamp: new Date('2024-01-01T10:05:00'),
        },
        {
          id: 'm10',
          content: 'Attention 메커니즘을 조정하여 특정 편향을 완화할 수 있는 방법이 있을까요?',
          role: 'user',
          branchId: 'merge1',
          timestamp: new Date('2024-01-01T10:06:00'),
        },
      ],
    },
    {
      id: 'implementation',
      parentId: 'merge1',
      title: '실제 구현 방안',
      description: '편향 완화 기술 구현',
      type: 'solution',
      status: 'active',
      depth: 4,
      color: '#795548',
      messages: [
        {
          id: 'm11',
          content: '다음과 같은 구체적인 구현 방안을 제안합니다:\n\n1. Debiasing Layer 추가\n2. Fairness Constraint 적용\n3. Balanced Training Data 구성',
          role: 'assistant',
          branchId: 'implementation',
          timestamp: new Date('2024-01-01T10:07:00'),
        },
      ],
    },
    {
      id: 'merge2',
      parentId: null,
      parentIds: ['privacy', 'optimization'],
      title: '프라이버시 보호 최적화',
      description: '개인정보를 보호하면서 성능 최적화',
      type: 'merge',
      status: 'paused',
      depth: 3,
      color: '#9E9E9E',
      isMerge: true,
      messages: [],
    },
  ]
  
  return branches
}

// 히스토리에 현재 상태 저장하는 헬퍼 함수
const saveToHistory = (state: ConversationState): HistoryState[] => {
  const currentState: HistoryState = {
    branches: JSON.parse(JSON.stringify(state.branches)),
    currentBranchId: state.currentBranchId,
    messages: [...state.messages],
    edgeLabels: { ...state.edgeLabels },
  }
  
  // 현재 인덱스 이후의 히스토리 제거 (새로운 브랜치 생성)
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(currentState)
  
  // 히스토리 크기 제한 (최대 50개)
  if (newHistory.length > 50) {
    newHistory.shift()
  }
  
  return newHistory
}

// 기본 엣지 라벨
const getDefaultEdgeLabels = (): EdgeLabels => ({
  'root-ethics': '윤리적 관점',
  'root-technical': '기술적 관점',
  'ethics-bias': '편향성 탐구',
  'ethics-privacy': '프라이버시 이슈',
  'technical-transformer': '아키텍처 분석',
  'technical-optimization': '최적화 방법',
  'bias-merge1': '편향 완화 적용',
  'transformer-merge1': '기술 구현',
  'merge1-implementation': '실제 적용',
})

export const useConversationStore = create<ConversationState>((set, get) => ({
  branches: [],
  currentBranchId: 'root',
  messages: [],
  edgeLabels: {},
  sessionName: 'Branching AI 세션',
  settings: {
    darkMode: false,
    fontSize: 'medium',
    aiModel: 'gpt-4',
  },
  history: [],
  historyIndex: -1,
  
  addMessage: (message) => {
    const state = get()
    const currentBranch = state.branches.find(b => b.id === message.branchId)
    if (!currentBranch) return
    
    // 현재 노드가 자식을 가지고 있는지 확인
    const hasChildren = state.branches.some(b => 
      b.parentId === currentBranch.id || b.parentIds?.includes(currentBranch.id)
    )
    
    // 자식이 있으면 새로운 자식 노드 생성
    if (hasChildren) {
      const newBranchId = `branch_${Date.now()}`
      const newBranch: Branch = {
        id: newBranchId,
        parentId: currentBranch.id,
        title: `${currentBranch.title} - 계속`,
        description: '대화 계속',
        type: currentBranch.type,
        status: 'active',
        depth: currentBranch.depth + 1,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      // 새 브랜치에 메시지 추가
      const newMessage: Message = {
        ...message,
        id: `msg_${Date.now()}`,
        branchId: newBranchId,
        timestamp: new Date(),
      }
      newBranch.messages.push(newMessage)
      
      set((state) => {
        const newHistory = saveToHistory(state)
        const updatedBranches = [...state.branches, newBranch]
        return {
          branches: updatedBranches,
          currentBranchId: newBranchId,
          messages: [...state.messages, newMessage],
          history: newHistory,
          historyIndex: newHistory.length - 1,
        }
      })
      
      // 새 브랜치로 전환 (약간의 지연을 두어 렌더링 보장)
      setTimeout(() => {
        get().switchBranch(newBranchId)
      }, 100)
    } else {
      // 자식이 없으면 현재 노드에 메시지 추가
      const newMessage: Message = {
        ...message,
        id: `msg_${Date.now()}`,
        timestamp: new Date(),
      }
      
      set((state) => {
        const branch = state.branches.find(b => b.id === message.branchId)
        if (branch) {
          branch.messages.push(newMessage)
          branch.updatedAt = new Date()
        }
        
        return {
          messages: [...state.messages, newMessage],
          branches: [...state.branches],
        }
      })
    }
  },
  
  switchBranch: (branchId) => {
    const state = get()
    const branch = state.branches.find(b => b.id === branchId)
    if (!branch) return

    // 부모 노드들의 컨텍스트 수집
    const getAncestorMessages = (currentBranch: Branch): Message[] => {
      const messages: Message[] = []
      
      // 머지 노드의 경우 여러 부모 브랜치들의 메시지 수집
      if (currentBranch.isMerge && currentBranch.parentIds) {
        // 공통 조상 브랜치 찾기
        const findCommonAncestors = (branchIds: string[]): Set<string> => {
          const ancestorSets = branchIds.map(branchId => {
            const ancestors = new Set<string>()
            let current = state.branches.find(b => b.id === branchId)
            while (current) {
              ancestors.add(current.id)
              current = current.parentId 
                ? state.branches.find(b => b.id === current!.parentId)
                : undefined
            }
            return ancestors
          })
          
          // 모든 브랜치의 공통 조상 찾기
          return ancestorSets.reduce((common, ancestors) => {
            return new Set([...common].filter(x => ancestors.has(x)))
          })
        }
        
        const commonAncestors = findCommonAncestors(currentBranch.parentIds)
        const processedBranches = new Set<string>()
        
        // 공통 조상 메시지 먼저 추가
        const rootBranch = state.branches.find(b => b.id === 'root')
        if (rootBranch && commonAncestors.has('root')) {
          messages.push(...rootBranch.messages)
          processedBranches.add('root')
        }
        
        // 머지 구분자 추가
        messages.push({
          id: `merge_divider_${currentBranch.id}`,
          content: `━━━ 머지 지점: ${currentBranch.parentIds.map(id => 
            state.branches.find(b => b.id === id)?.title || id
          ).join(' + ')} ━━━`,
          role: 'assistant',
          branchId: currentBranch.id,
          timestamp: new Date(),
        })
        
        // 각 부모 브랜치의 고유 메시지만 추가
        currentBranch.parentIds.forEach(parentId => {
          const parentBranch = state.branches.find(b => b.id === parentId)
          if (parentBranch && !processedBranches.has(parentId)) {
            // 공통 조상이 아닌 메시지만 추가
            if (!commonAncestors.has(parentId) && parentBranch.messages.length > 0) {
              messages.push({
                id: `parent_divider_${parentId}`,
                content: `[브랜치: ${parentBranch.title}]`,
                role: 'assistant',
                branchId: parentId,
                timestamp: parentBranch.messages[0].timestamp,
              })
              messages.push(...parentBranch.messages)
            }
            processedBranches.add(parentId)
          }
        })
        
        // 현재 머지 노드의 메시지 추가
        if (currentBranch.messages.length > 0) {
          messages.push({
            id: `current_divider_${currentBranch.id}`,
            content: `━━━ 머지 요약: ${currentBranch.title} ━━━`,
            role: 'assistant',
            branchId: currentBranch.id,
            timestamp: currentBranch.messages[0]?.timestamp || new Date(),
          })
          messages.push(...currentBranch.messages)
        }
      } 
      // 일반 노드의 경우 기존 로직 사용
      else {
        let current: Branch | undefined = currentBranch
        
        // 루트까지 거슬러 올라가며 브랜치 수집
        const ancestorBranches: Branch[] = []
        while (current) {
          ancestorBranches.unshift(current) // 부모부터 순서대로
          current = current.parentId 
            ? state.branches.find(b => b.id === current!.parentId)
            : undefined
        }
        
        // 각 브랜치의 메시지를 순서대로 추가
        ancestorBranches.forEach((ancestorBranch, index) => {
          // 브랜치 전환 구분자 추가 (첫 브랜치 제외)
          if (index > 0 && ancestorBranch.messages.length > 0) {
            messages.push({
              id: `divider_${ancestorBranch.id}`,
              content: `━━━ 브랜치: ${ancestorBranch.title} ━━━`,
              role: 'assistant',
              branchId: ancestorBranch.id,
              timestamp: ancestorBranch.messages[0]?.timestamp || new Date(),
            })
          }
          
          // 해당 브랜치의 메시지 추가
          messages.push(...ancestorBranch.messages)
        })
      }
      
      return messages
    }
    
    const allMessages = getAncestorMessages(branch)
    
    set({ 
      currentBranchId: branchId,
      messages: allMessages,
    })
  },
  
  createBranch: (parentId, title, type) => {
    const parentBranch = get().branches.find(b => b.id === parentId)
    if (!parentBranch) return
    
    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      parentId,
      title,
      description: '',
      type,
      status: 'active',
      depth: parentBranch.depth + 1,
      messages: [],
    }
    
    set((state) => ({
      branches: [...state.branches, newBranch],
    }))
  },
  
  initializeWithDummyData: () => {
    const dummyBranches = generateDummyData()
    const rootBranch = dummyBranches.find(b => b.id === 'root')
    
    const initialState: HistoryState = {
      branches: JSON.parse(JSON.stringify(dummyBranches)),
      currentBranchId: 'root',
      messages: rootBranch?.messages || [],
      edgeLabels: getDefaultEdgeLabels(),
    }
    
    set({
      branches: dummyBranches,
      currentBranchId: 'root',
      messages: rootBranch?.messages || [],
      edgeLabels: getDefaultEdgeLabels(),
      sessionName: 'AI 윤리와 기술 구현 탐구',
      history: [initialState],
      historyIndex: 0,
    })
  },
  
  createNewSession: () => {
    const newRootBranch: Branch = {
      id: 'root',
      parentId: null,
      title: '새 대화',
      description: '새로운 대화를 시작하세요',
      type: 'main',
      status: 'active',
      depth: 0,
      messages: [],
      tokenCount: 0,
      summary: '새로운 대화 세션',
      keyPoints: [],
    }
    
    set((state) => {
      const newHistory = saveToHistory(state)
      return {
        branches: [newRootBranch],
        currentBranchId: 'root',
        messages: [],
        sessionName: `새 세션 ${new Date().toLocaleDateString('ko-KR')}`,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },
  
  createSummaryNode: (nodeIds: string[], instructions?: string) => {
    if (nodeIds.length < 2) return null
    
    const state = get()
    const selectedBranches = nodeIds.map(id => state.branches.find(b => b.id === id)).filter(Boolean) as Branch[]
    
    if (selectedBranches.length < 2) return null
    
    // 가장 깊은 depth 찾기
    const maxDepth = Math.max(...selectedBranches.map(b => b.depth))
    
    // 키 포인트와 토큰 수 수집
    const keyPointsSet = new Set<string>()
    let totalTokenCount = 0
    
    selectedBranches.forEach(branch => {
      branch.keyPoints?.forEach(kp => keyPointsSet.add(kp))
      totalTokenCount += branch.tokenCount || 0
    })
    
    // 요약 노드 생성
    const summaryId = `summary_${Date.now()}`
    const isManualSummary = !!instructions
    
    // 지침 기반 요약 메시지 생성
    const summaryContent = instructions
      ? `[지침 기반 요약]\n\n지침: "${instructions}"\n\n선택된 노드들을 위 지침에 따라 분석:\n${selectedBranches.map(b => `• ${b.title}: ${b.summary || b.description}`).join('\n')}\n\n[지침에 따른 핵심 분석]\n${Array.from(keyPointsSet).slice(0, 5).map(kp => `• ${kp}`).join('\n')}\n\n이 관점에서 새로운 탐구를 진행합니다.`
      : `[자동 요약]\n\n선택된 노드:\n${selectedBranches.map(b => `• ${b.title}: ${b.summary || b.description}`).join('\n')}\n\n[통합 포인트]\n${Array.from(keyPointsSet).slice(0, 5).map(kp => `• ${kp}`).join('\n')}\n\n이 내용들을 통합하여 새로운 탐구를 진행할 수 있습니다.`
    
    const summaryNode: Branch = {
      id: summaryId,
      parentId: null,
      parentIds: nodeIds,
      title: isManualSummary ? `지침 기반 요약` : `자동 요약`,
      description: isManualSummary 
        ? `"${instructions.substring(0, 50)}${instructions.length > 50 ? '...' : ''}" 기반 요약`
        : `${nodeIds.length}개 노드 자동 통합 요약`,
      type: 'merge',
      status: 'active',
      depth: maxDepth + 1,
      isMerge: true,
      messages: [
        {
          id: `summary_msg_${Date.now()}`,
          content: summaryContent,
          role: 'assistant',
          branchId: summaryId,
          timestamp: new Date(),
        }
      ],
      tokenCount: totalTokenCount,
      summary: isManualSummary 
        ? `${instructions.substring(0, 100)}${instructions.length > 100 ? '...' : ''}`
        : `${nodeIds.length}개 노드의 자동 통합 분석`,
      keyPoints: Array.from(keyPointsSet).slice(0, 5),
      charts: [{
        type: 'list',
        content: selectedBranches.map(b => b.title)
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    set((state) => {
      const newHistory = saveToHistory(state)
      return {
        branches: [...state.branches, summaryNode],
        currentBranchId: summaryNode.id, // 새로 생성된 노드로 포커스 이동
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
    
    // switchBranch를 호출하여 메시지도 업데이트
    setTimeout(() => {
      get().switchBranch(summaryNode.id)
    }, 0)
    
    return summaryNode.id
  },
  
  createReferenceNode: (nodeIds: string[]) => {
    if (nodeIds.length === 0) return null
    
    const state = get()
    const referencedBranches = nodeIds.map(id => state.branches.find(b => b.id === id)).filter(Boolean) as Branch[]
    
    if (referencedBranches.length === 0) return null
    
    // 가장 깊은 depth 찾기
    const maxDepth = Math.max(...referencedBranches.map(b => b.depth))
    
    // 참조 노드 생성
    const refId = `ref_${Date.now()}`
    const referenceNode: Branch = {
      id: refId,
      parentId: nodeIds.length === 1 ? nodeIds[0] : null,
      parentIds: nodeIds.length > 1 ? nodeIds : undefined,
      title: `벡터 검색 기반 탐구`,
      description: `${referencedBranches.map(b => b.title).join(', ')} 기반 벡터 검색 결과`,
      type: nodeIds.length > 1 ? 'merge' : 'exploration',
      status: 'active',
      depth: maxDepth + 1,
      isMerge: nodeIds.length > 1,
      messages: [
        {
          id: `ref_msg_${Date.now()}`,
          content: `벡터 검색 결과\n\n참조된 노드:\n${referencedBranches.map(b => `• ${b.title}: ${b.summary || b.description}`).join('\n')}\n\n이 컨텍스트를 기반으로 새로운 탐구를 시작합니다.`,
          role: 'assistant',
          branchId: refId,
          timestamp: new Date(),
        }
      ],
      tokenCount: 0,
      summary: `${referencedBranches.map(b => b.title).join(', ')} 참조`,
      keyPoints: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    set((state) => {
      const newHistory = saveToHistory(state)
      return {
        branches: [...state.branches, referenceNode],
        currentBranchId: referenceNode.id,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
    
    return referenceNode.id
  },
  
  deleteNodes: (nodeIds: string[]) => {
    if (nodeIds.length === 0) return
    
    const state = get()
    
    // 삭제할 노드의 자식 노드들도 찾기
    const getAllDescendants = (nodeId: string): string[] => {
      const descendants: string[] = []
      const children = state.branches.filter(b => 
        b.parentId === nodeId || b.parentIds?.includes(nodeId)
      )
      
      children.forEach(child => {
        descendants.push(child.id)
        descendants.push(...getAllDescendants(child.id))
      })
      
      return descendants
    }
    
    // 모든 삭제 대상 노드 수집
    const allNodesToDelete = new Set(nodeIds)
    nodeIds.forEach(nodeId => {
      getAllDescendants(nodeId).forEach(id => allNodesToDelete.add(id))
    })
    
    // 현재 브랜치가 삭제되는 경우 root로 전환
    const newCurrentBranchId = allNodesToDelete.has(state.currentBranchId) 
      ? 'root' 
      : state.currentBranchId
    
    // 삭제되지 않는 브랜치만 필터링
    const remainingBranches = state.branches.filter(b => !allNodesToDelete.has(b.id))
    
    set((state) => {
      const newHistory = saveToHistory(state)
      return {
        branches: remainingBranches,
        currentBranchId: newCurrentBranchId,
        messages: newCurrentBranchId === 'root' 
          ? remainingBranches.find(b => b.id === 'root')?.messages || []
          : state.messages,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },
  
  undo: () => {
    const state = get()
    if (state.historyIndex > 0) {
      const previousState = state.history[state.historyIndex - 1]
      set({
        branches: JSON.parse(JSON.stringify(previousState.branches)),
        currentBranchId: previousState.currentBranchId,
        messages: [...previousState.messages],
        edgeLabels: { ...previousState.edgeLabels },
        historyIndex: state.historyIndex - 1,
      })
    }
  },
  
  redo: () => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1]
      set({
        branches: JSON.parse(JSON.stringify(nextState.branches)),
        currentBranchId: nextState.currentBranchId,
        messages: [...nextState.messages],
        edgeLabels: { ...nextState.edgeLabels },
        historyIndex: state.historyIndex + 1,
      })
    }
  },
  
  canUndo: () => {
    const state = get()
    return state.historyIndex > 0
  },
  
  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },
  
  updateEdgeLabel: (edgeId: string, label: string) => {
    set((state) => {
      const newEdgeLabels = { ...state.edgeLabels }
      if (label.trim()) {
        newEdgeLabels[edgeId] = label
      } else {
        delete newEdgeLabels[edgeId]
      }
      
      const newHistory = saveToHistory(state)
      return {
        edgeLabels: newEdgeLabels,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },
  
  updateSessionName: (name: string) => {
    set({ sessionName: name })
  },
  
  updateSettings: (newSettings: Partial<Settings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }))
  },
}))