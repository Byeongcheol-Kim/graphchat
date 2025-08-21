import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Box,
  Paper,
  List,
  Divider,
  Typography,
  Collapse,
  IconButton,
  CircularProgress,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useConversationStore } from '@store/conversationStore'
import { useMessageStore } from '@store/messageStore'
import { useNodeStore } from '@store/nodeStore'
import { useSessionStore } from '@store/sessionStore'
import { useBranchStore } from '@store/branchStore'
import { Branch, Message } from '@/types'
import { useThemeColor } from '@shared/hooks/useThemeColor'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { MessageItem } from './MessageItem'
import VectorSearchModal from './VectorSearchModal'
import SummaryDialog from '../../graph/components/SummaryDialog'
import BranchRecommendations from './BranchRecommendations'
import websocketService from '@/services/websocketService'
import { useRecommendationStore } from '@/store/recommendationStore'

interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
}

const ConversationPanel: React.FC = () => {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [showVectorSearch, setShowVectorSearch] = useState(false)
  const [vectorSearchInitialQuery, setVectorSearchInitialQuery] = useState('')
  // const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  // 요약 노드의 부모 노드들은 기본적으로 펼침
  const [expandedParentNodes, setExpandedParentNodes] = useState<Set<string>>(new Set()) // 부모 노드 펼침 상태
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [selectedNodesForSummary, setSelectedNodesForSummary] = useState<string[]>([])
  // 브랜치 추천 스토어 사용
  const { 
    setRecommendations, 
    getRecommendations, 
    dismissRecommendations, 
    isRecommendationDismissed 
  } = useRecommendationStore()
  const [parentMessagesCache, setParentMessagesCache] = useState<Record<string, Message[]>>({}) // 부모 노드 메시지 캐시
  const [loadingParentMessages, setLoadingParentMessages] = useState<Set<string>>(new Set()) // 로딩 중인 부모 노드
  
  const { 
    messages, 
    currentBranchId, 
    branches, 
    addMessage, 
    switchBranch, 
    createSummaryNode, 
    createReferenceNode,
  } = useConversationStore()
  
  // nodeStore에서 요약 중 상태 가져오기
  const { isSummarizing } = useNodeStore()
  
  const {
    isLoading,
    streamingContent,
    streamingNodeId,
    startStreaming,
    appendStreamChunk,
    endStreaming,
    clearStreaming
  } = useMessageStore()
  
  const { getNodeTypeColor } = useThemeColor()
  const listRef = useRef<HTMLUListElement>(null)
  
  // 웹소켓 이벤트 리스너
  useEffect(() => {
    // 스트림 시작
    const unsubStreamStart = websocketService.on('stream_start', (data: any) => {
      if (data.node_id === currentBranchId) {
        startStreaming(data.node_id)
      }
    })
    
    // 스트림 청크
    const unsubStreamChunk = websocketService.on('stream_chunk', (data: any) => {
      if (data.node_id === currentBranchId) {
        appendStreamChunk(data.chunk)
      }
    })
    
    // 스트림 완료
    const unsubStreamEnd = websocketService.on('stream_end', (data: any) => {
      if (data.node_id === currentBranchId) {
        endStreaming(data.full_response, data.message_id)
        
        // 브랜치 추천이 있으면 저장 (현재 메시지 개수와 함께)
        if (data.recommended_branches && data.recommended_branches.length > 0) {
          const currentMessages = messages.filter(m => m.branchId === currentBranchId)
          setRecommendations(currentBranchId, data.recommended_branches, currentMessages.length + 1)
        }
      }
    })
    
    // 일반 채팅 응답 (non-streaming)
    const unsubChatResponse = websocketService.on('chat_response', (data) => {
      if (data.data?.node_id === currentBranchId) {
        // 로딩 종료
        clearStreaming()
        
        // 브랜치 추천이 있으면 저장 (현재 메시지 개수와 함께)
        if (data.data?.recommended_branches && data.data.recommended_branches.length > 0) {
          const currentMessages = messages.filter(m => m.branchId === currentBranchId)
          setRecommendations(currentBranchId, data.data.recommended_branches, currentMessages.length)
        }
      }
    })
    
    // 참조 노드 필요 응답
    const unsubRefRequired = websocketService.on('reference_node_required', (data: any) => {
      // 사용자에게 확인 메시지 표시 (나중에 다이얼로그로 개선 가능)
      if (window.confirm(data.message)) {
        websocketService.send('create_reference_and_chat', {
          node_id: data.node_id,
          message: input
        })
      }
    })
    
    // 참조 노드 생성 완료
    const unsubRefCreated = websocketService.on('reference_node_created', (data: any) => {
      // 새로운 참조 노드로 자동 전환
      if (data.reference_node) {
        console.log('참조 노드 생성 완료, 새 노드로 전환:', data.reference_node.id)
        
        // 노드 추가 (백엔드에서 이미 생성했으므로 프론트엔드 스토어에만 추가)
        const nodeStore = useNodeStore.getState()
        const branchStore = useBranchStore.getState()
        
        // nodeStore에 추가
        if (nodeStore.addNode) {
          nodeStore.addNode(data.reference_node)
        }
        
        // branchStore에도 추가 (그래프 표시를 위해)
        const newBranch = {
          id: data.reference_node.id,
          parentId: data.parent_node_id,
          title: data.reference_node.title,
          type: data.reference_node.type || 'reference',
          messages: [],
          depth: data.reference_node.depth || 0,
          metadata: data.reference_node.metadata || {}
        }
        branchStore.addBranch(newBranch)
        
        // 엣지 라벨 저장
        if (data.edge) {
          const sessionStore = useSessionStore.getState()
          sessionStore.updateEdgeLabel(data.edge.id, data.edge.label)
        }
        
        // 새 노드로 전환
        setTimeout(() => {
          switchBranch(data.reference_node.id)
          // 메시지 목록 초기화 (새 노드이므로)
          const messageStore = useMessageStore.getState()
          messageStore.clearMessages()
        }, 100) // 약간의 딜레이를 주어 노드가 추가된 후 전환
      }
    })
    
    // 요약 생성 완료 이벤트
    const unsubSummaryCompleted = websocketService.on('summary_completed', (data: any) => {
      console.log('요약 생성 완료 이벤트 수신:', data)
      
      // 현재 노드가 요약 노드인 경우 업데이트
      if (data.node_id === currentBranchId) {
        console.log('현재 노드의 요약 완료, 업데이트 시작')
        
        // nodeStore 업데이트
        const { updateNode } = useNodeStore.getState()
        updateNode(data.node_id, {
          title: data.title,
          content: data.content,
          isGenerating: false
        })
        
        // branchStore도 업데이트
        const { updateBranch } = useBranchStore.getState()
        updateBranch(data.node_id, {
          title: data.title,
          content: data.content,
          isGenerating: false
        })
        
        // 메시지 추가
        if (data.content) {
          addMessage({
            id: `msg_${Date.now()}`,
            content: data.content,
            role: 'assistant',
            branchId: data.node_id,
            timestamp: new Date()
          })
        }
        
        console.log('요약 노드 업데이트 완료')
      }
    })
    
    // 새로운 백엔드 이벤트 리스너 추가
    const unsubCreatingRef = websocketService.on('creating_reference_node', (data: any) => {
      // 참조 노드 생성 중 알림 표시
      console.log('참조 노드 생성 중:', data.message)
      // TODO: 토스트 또는 스낵바로 사용자에게 알림
    })
    
    const unsubGeneratingSummary = websocketService.on('generating_summary', (data: any) => {
      // 요약 생성 중 알림 표시  
      console.log('요약 생성 중:', data.message)
      // TODO: 토스트 또는 스낵바로 사용자에게 알림
    })
    
    const unsubSummaryGenerated = websocketService.on('summary_generated', (data: any) => {
      // 요약 생성 완료
      console.log('요약 생성 완료:', data.summary)
      // 노드 메타데이터 업데이트
      if (data.node_id && data.summary) {
        // nodeStore 업데이트
        const { updateNode } = useNodeStore.getState()
        updateNode(data.node_id, {
          metadata: {
            summary: data.summary
          },
          isGenerating: false
        })
        
        // branchStore도 업데이트
        const { updateBranch } = useBranchStore.getState()
        updateBranch(data.node_id, {
          metadata: {
            summary: data.summary
          },
          isGenerating: false
        })
      }
    })
    
    // 브랜치 추천 이벤트 리스너 (기존)
    const handleBranchRecommendations = (event: CustomEvent) => {
      const { recommendations, parentNodeId } = event.detail
      if (parentNodeId === currentBranchId) {
        const currentMessages = messages.filter(m => m.branchId === currentBranchId)
        setRecommendations(parentNodeId, recommendations, currentMessages.length)
      }
    }
    
    window.addEventListener('branch-recommendations', handleBranchRecommendations as any)
    
    return () => {
      unsubStreamStart()
      unsubStreamChunk()
      unsubStreamEnd()
      unsubChatResponse()
      unsubRefRequired()
      unsubRefCreated()
      unsubSummaryCompleted()
      unsubCreatingRef()
      unsubGeneratingSummary()
      unsubSummaryGenerated()
      window.removeEventListener('branch-recommendations', handleBranchRecommendations as any)
    }
  }, [currentBranchId, startStreaming, appendStreamChunk, endStreaming, clearStreaming, setRecommendations, messages])
  
  const currentBranch = branches.find((b: Branch) => b.id === currentBranchId)
  const headerColor = getNodeTypeColor(currentBranch?.type)
  
  // 디버깅: 현재 브랜치 상태 출력
  useEffect(() => {
    if (currentBranch && currentBranch.type === 'summary') {
      console.log('현재 요약 노드 상태:', {
        id: currentBranch.id,
        isGenerating: currentBranch.isGenerating,
        title: currentBranch.title,
        content: currentBranch.content
      })
    }
  }, [currentBranch])
  
  // 머지 노드인 경우 부모 노드들 찾기
  // 요약 노드의 소스 노드들 찾기 (sourceNodeIds 또는 parentIds 체크)
  const sourceIds = (currentBranch as any)?.sourceNodeIds || (currentBranch as any)?.parentIds
  const isSummaryNode = (currentBranch as any)?.isSummary || (currentBranch as any)?.isMerge || currentBranch?.type === 'summary'
  const parentBranches = isSummaryNode && sourceIds
    ? sourceIds.map((id: string) => branches.find((b: Branch) => b.id === id)).filter(Boolean)
    : []
    
  // 부모 노드 찾기 (일반 노드의 경우)
  const parentBranch = currentBranch?.parentId 
    ? branches.find((b: Branch) => b.id === currentBranch.parentId)
    : null
    
  // 요약 노드로 전환할 때 부모 노드들을 자동으로 펼침
  useEffect(() => {
    if (isSummaryNode && sourceIds && sourceIds.length > 0) {
      setExpandedParentNodes(new Set(sourceIds))
      // 각 부모 노드의 메시지를 미리 로드
      sourceIds.forEach((nodeId: string) => {
        if (!parentMessagesCache[nodeId]) {
          loadParentNodeMessages(nodeId)
        }
      })
    }
  }, [currentBranchId, isSummaryNode])
    
  // 현재 노드의 메시지만 필터링
  // const currentNodeMessages = currentBranch?.messages || []
  
  // 노드 확장 토글
  // const toggleNodeExpansion = (nodeId: string) => {
  //   setExpandedNodes(prev => {
  //     const newSet = new Set(prev)
  //     if (newSet.has(nodeId)) {
  //       newSet.delete(nodeId)
  //     } else {
  //       newSet.add(nodeId)
  //     }
  //     return newSet
  //   })
  // }
  
  // 부모 노드 확장 토글
  const toggleParentNodeExpansion = async (nodeId: string) => {
    setExpandedParentNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
        // 부모 노드 메시지 로드 (캐시에 없을 경우)
        if (!parentMessagesCache[nodeId]) {
          loadParentNodeMessages(nodeId)
        }
      }
      return newSet
    })
  }
  
  // 부모 노드의 메시지 로드
  const loadParentNodeMessages = async (nodeId: string) => {
    // 로딩 중 표시
    setLoadingParentMessages(prev => new Set(prev).add(nodeId))
    
    try {
      const { messageService } = await import('@/services/messageService')
      const messages = await messageService.loadMessagesForNode(nodeId)
      
      setParentMessagesCache(prev => ({
        ...prev,
        [nodeId]: messages
      }))
    } catch (error) {
      console.error('부모 노드 메시지 로드 실패:', error)
      // 실패 시 빈 배열로 설정
      setParentMessagesCache(prev => ({
        ...prev,
        [nodeId]: []
      }))
    } finally {
      // 로딩 완료
      setLoadingParentMessages(prev => {
        const newSet = new Set(prev)
        newSet.delete(nodeId)
        return newSet
      })
    }
  }
  
  // 스크롤을 맨 아래로 (메시지 변경 시)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])
  
  // 스트리밍 중일 때 자동 스크롤
  useEffect(() => {
    if (streamingNodeId === currentBranchId && streamingContent && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [streamingNodeId, streamingContent, currentBranchId])
  
  // 브랜치 추천 상태 구독
  const nodeRecommendations = useRecommendationStore(state => state.recommendations[currentBranchId])
  
  // 브랜치 추천이 추가될 때 자동 스크롤
  useEffect(() => {
    if (nodeRecommendations && listRef.current) {
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }
      }, 100)
    }
  }, [nodeRecommendations])
  
  const handleSend = useCallback(async () => {
    if (input.trim() && currentBranchId) {
      // 현재 노드의 기존 추천을 오래된 것으로 표시
      const { markAsStale } = useRecommendationStore.getState()
      markAsStale(currentBranchId)
      
      // 백엔드가 자동으로 자식 노드 유무를 판단하고 처리
      addMessage({
        content: input,
        role: 'user',
        branchId: currentBranchId,
      })
      
      setInput('')
      setAttachments([])
    }
  }, [input, currentBranchId, addMessage])
  
  const handleFileAttach = useCallback((files: FileList) => {
    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: `file_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }))
    setAttachments(prev => [...prev, ...newAttachments])
  }, [])
  
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])
  
  const handleDownload = useCallback(() => {
    const content = messages.map(m => 
      `[${m.role === 'user' ? '사용자' : 'AI'}] ${m.content}`
    ).join('\n\n')
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `conversation_${currentBranchId}_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [messages, currentBranchId])
  
  // input 변경 핸들러 최적화
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])
  
  const handleVectorSearchSelect = async (nodeId: string) => {
    // Single node selection - create reference
    const refId = await createReferenceNode([nodeId])
    if (refId) {
      await switchBranch(refId)
    }
    setShowVectorSearch(false)
    setVectorSearchInitialQuery('')
  }
  
  const handleVectorSearchSummary = (nodeIds: string[]) => {
    // Multiple nodes - open summary dialog
    if (nodeIds.length > 1) {
      setSelectedNodesForSummary(nodeIds)
      setSummaryDialogOpen(true)
    } else if (nodeIds.length === 1) {
      // Single node - create reference
      handleVectorSearchSelect(nodeIds[0])
    }
    setShowVectorSearch(false)
    setVectorSearchInitialQuery('')
  }
  
  const handleCreateSummary = async (nodeIds: string[], instructions?: string) => {
    const summaryId = await createSummaryNode(nodeIds, instructions)
    if (summaryId) {
      await switchBranch(summaryId)
    }
    setSummaryDialogOpen(false)
    setSelectedNodesForSummary([])
  }
  
  // 현재 브랜치가 참조 노드인지 확인
  const isReferenceNode = currentBranch?.type === 'reference' || 
                          currentBranch?.isReference || 
                          (currentBranch as any)?.sourceNodeIds?.length > 0

  // isSummaryNode는 이미 175번 줄에서 선언됨

  // 부모 노드들 수집 (현재 노드로부터 루트까지)
  const getParentNodes = (): Branch[] => {
    // 참조 노드는 부모 노드를 표시하지 않음 (소스 노드들의 메시지를 직접 표시)
    if (isReferenceNode) {
      return []
    }
    
    // 요약 노드는 부모 노드를 표시하지 않음
    if (isSummaryNode) {
      return []
    }
    
    const parents: Branch[] = []
    let current = currentBranch
    
    while (current && current.parentId) {
      const parent = branches.find((b: Branch) => b.id === current!.parentId)
      if (parent) {
        // 요약 노드를 만나면 중단 (요약 노드의 부모는 표시하지 않음)
        if (parent.type === 'summary' || parent.isSummary) {
          parents.unshift(parent) // 요약 노드는 포함
          break
        }
        parents.unshift(parent) // 루트부터 순서대로
        current = parent
      } else {
        break
      }
    }
    
    return parents
  }
  
  const parentNodes = getParentNodes()
  
  // 부모 노드들의 메시지 개수 초기 로드
  useEffect(() => {
    parentNodes.forEach(node => {
      if (!parentMessagesCache[node.id] && !loadingParentMessages.has(node.id)) {
        // 메시지 개수만 미리 로드 (확장하지 않은 상태에서도 개수 표시를 위해)
        loadParentNodeMessages(node.id)
      }
    })
  }, [currentBranchId]) // currentBranchId가 변경될 때마다 부모 노드들 확인
  
  // 참조 노드를 위한 대화 기록 로드
  const [referenceHistory, setReferenceHistory] = useState<Message[]>([])
  const [referenceHistoryLoading, setReferenceHistoryLoading] = useState(false)
  const [expandedSourceNodes, setExpandedSourceNodes] = useState<Set<string>>(new Set()) // 소스 노드 펼침 상태
  
  useEffect(() => {
    if (isReferenceNode && currentBranchId) {
      setReferenceHistoryLoading(true)
      // history API를 사용하여 모든 소스 노드들의 메시지를 가져옴
      import('@/services/messageService').then(({ messageService }) => {
        messageService.getHistory(currentBranchId).then(history => {
          // history는 ConversationHistory 객체이므로 messages 추출
          const messages = history.messages || history || []
          setReferenceHistory(messages)
          setReferenceHistoryLoading(false)
        }).catch(error => {
          console.error('참조 노드 대화 기록 로드 실패:', error)
          setReferenceHistory([])
          setReferenceHistoryLoading(false)
        })
      })
    } else {
      setReferenceHistory([])
    }
  }, [currentBranchId, isReferenceNode])

  // 소스 노드 확장 토글
  const toggleSourceNodeExpansion = (nodeId: string) => {
    setExpandedSourceNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  // 참조 노드의 메시지를 소스 노드별로 그룹화
  const referenceMessageGroups: { node: Branch | null; messages: Message[] }[] = []
  if (isReferenceNode && referenceHistory.length > 0) {
    const groupMap = new Map<string, { node: Branch | null; messages: Message[] }>()
    
    referenceHistory.forEach((message: Message) => {
      const nodeId = message.branchId || message.node_id || 'unknown'
      const sourceBranch = branches.find((b: Branch) => b.id === nodeId)
      
      if (!groupMap.has(nodeId)) {
        groupMap.set(nodeId, {
          node: sourceBranch || null,
          messages: []
        })
      }
      groupMap.get(nodeId)!.messages.push(message)
    })
    
    // Map을 배열로 변환
    groupMap.forEach(group => {
      referenceMessageGroups.push(group)
    })
  }

  // 현재 노드의 메시지 그룹화 (참조 노드가 아닌 경우)
  const currentMessageGroups: { node: Branch | null; messages: any[] }[] = []
  if (!isReferenceNode) {
    let currentGroup: { node: Branch | null; messages: any[] } | null = null
    const currentMessages = messages.filter(m => m.branchId === currentBranchId)
    
    currentMessages.forEach((message: Message) => {
      const sourceBranch = branches.find((b: Branch) => b.id === message.branchId)
      
      if (!currentGroup || currentGroup.node?.id !== message.branchId) {
        if (currentGroup) {
          currentMessageGroups.push(currentGroup)
        }
        currentGroup = {
          node: sourceBranch || null,
          messages: [message],
        }
      } else {
        currentGroup.messages.push(message)
      }
    })
    
    if (currentGroup) {
      currentMessageGroups.push(currentGroup)
    }
  }
  
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }}
      >
        {/* 헤더 */}
        <ChatHeader
          currentBranch={currentBranch}
          parentBranches={parentBranches as Branch[]}
          parentBranch={parentBranch}
          headerColor={headerColor}
          // onDownload={handleDownload}
          onSwitchBranch={switchBranch}
          // onOpenVectorSearch={() => setShowVectorSearch(true)}
          // onOpenSummary={() => setSummaryDialogOpen(true)}
        />
        
        {/* 메시지 목록 */}
        <List
          ref={listRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 1.5,
            py: 0.75,
          }}
        >
          {/* 부모 노드들의 대화 내역 (접었다 펼칠 수 있음) */}
          {parentNodes.map((parentNode, index) => {
            const isExpanded = expandedParentNodes.has(parentNode.id)
            const isLoading = loadingParentMessages.has(parentNode.id)
            // 캐시된 메시지 사용, 없으면 빈 배열
            const parentMessages = parentMessagesCache[parentNode.id] || []
            
            return (
              <Box key={`parent_${parentNode.id}`}>
                {/* 부모 노드 헤더 */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 0.4,
                    px: 1,
                    my: 0.5,
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                  onClick={() => toggleParentNodeExpansion(parentNode.id)}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      flex: 1,
                      fontWeight: 500,
                      fontSize: '10px',
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: getNodeTypeColor(parentNode.type),
                        display: 'inline-block',
                      }}
                    />
                    {index === 0 ? '루트' : `부모 ${index}`}: {parentNode.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontSize: '9px' }}>
                    {isLoading ? '로딩 중...' : `메시지 ${parentMessages.length}개`}
                  </Typography>
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    {isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                  </IconButton>
                </Box>
                
                {/* 부모 노드의 메시지들 */}
                <Collapse in={isExpanded} timeout="auto">
                  <Box sx={{ 
                    pl: 2, 
                    borderLeft: '2px solid',
                    borderColor: 'divider',
                    ml: 1,
                    opacity: 0.8,
                  }}>
                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={20} />
                      </Box>
                    ) : parentMessages.length > 0 ? (
                      parentMessages.map(message => (
                        <MessageItem
                          key={`parent_msg_${message.id}`}
                          message={message}
                          headerColor={getNodeTypeColor(parentNode.type)}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ py: 1, display: 'block' }}>
                        메시지가 없습니다
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
          
          {/* 부모 노드가 있을 경우 구분선 */}
          {parentNodes.length > 0 && (
            <Divider sx={{ my: 1.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
                현재 노드
              </Typography>
            </Divider>
          )}
          
          {/* 참조 노드의 소스 노드별 메시지들 */}
          {isReferenceNode && !referenceHistoryLoading && referenceMessageGroups.map((group, groupIndex) => {
            const isExpanded = expandedSourceNodes.has(group.node?.id || `group_${groupIndex}`)
            const nodeId = group.node?.id || `group_${groupIndex}`
            
            return (
              <Box key={`source_${nodeId}`}>
                {/* 소스 노드 헤더 */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 0.4,
                    px: 1,
                    my: 0.5,
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                  onClick={() => toggleSourceNodeExpansion(nodeId)}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      flex: 1,
                      fontWeight: 500,
                      fontSize: '10px',
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: getNodeTypeColor(group.node?.type),
                        display: 'inline-block',
                      }}
                    />
                    소스 노드: {group.node?.title || '알 수 없음'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontSize: '9px' }}>
                    메시지 {group.messages.length}개
                  </Typography>
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    {isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                  </IconButton>
                </Box>
                
                {/* 소스 노드의 메시지들 */}
                <Collapse in={isExpanded} timeout="auto">
                  <Box sx={{ 
                    pl: 2, 
                    borderLeft: '2px solid',
                    borderColor: 'divider',
                    ml: 1,
                    opacity: 0.9,
                  }}>
                    {group.messages.map(message => (
                      <MessageItem
                        key={`source_msg_${message.id}`}
                        message={message}
                        headerColor={getNodeTypeColor(group.node?.type)}
                      />
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
          
          {/* 현재 노드가 생성 중인 경우 (요약 등) 로딩 표시 */}
          {currentBranch?.isGenerating && (
            <Box sx={{ 
              mx: 2, 
              my: 2, 
              p: 2, 
              backgroundColor: 'info.lighter',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.light',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <CircularProgress size={24} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {currentBranch?.type === 'summary' ? '요약 생성 중...' : '노드 생성 중...'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentBranch?.type === 'summary' 
                    ? 'AI가 선택한 노드들의 내용을 요약하고 있습니다.'
                    : 'AI가 노드 내용을 생성하고 있습니다.'}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* 요약 노드인 경우 요약 내용 표시 */}
          {isSummaryNode && !isSummarizing && (currentBranch?.summary || (currentBranch as any)?.summaryContent) && (
            <Box sx={{ 
              mx: 2, 
              my: 1, 
              p: 1.5, 
              backgroundColor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {currentBranch?.summary || (currentBranch as any)?.summaryContent}
              </Typography>
            </Box>
          )}
          
          {/* 참조 노드 로딩 중 */}
          {isReferenceNode && referenceHistoryLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={30} />
            </Box>
          )}
          
          {/* 참조 노드의 현재 메시지들 */}
          {isReferenceNode && messages.filter(m => m.branchId === currentBranchId).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  현재 노드 메시지
                </Typography>
              </Divider>
              {messages.filter(m => m.branchId === currentBranchId).map(message => (
                <MessageItem
                  key={`ref_current_${message.id}`}
                  message={message}
                  headerColor={getNodeTypeColor(currentBranch?.type)}
                />
              ))}
            </Box>
          )}
          
          {/* 현재 노드의 메시지들 (참조 노드가 아닌 경우) */}
          {!isReferenceNode && currentMessageGroups.map((group, groupIndex) => {
            const isCurrentNode = group.node?.id === currentBranchId
            
            return (
              <Box key={`current_group_${groupIndex}`}>
                {/* 현재 노드의 메시지들 */}
                {group.messages.map(message => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    headerColor={headerColor}
                  />
                ))}
                
                {/* 스트리밍 메시지 표시 (현재 노드인 경우만) */}
                {isCurrentNode && streamingNodeId === currentBranchId && streamingContent && (
                  <MessageItem
                    key="streaming-message"
                    message={{
                      id: 'streaming',
                      content: streamingContent,
                      role: 'assistant',
                      branchId: currentBranchId,
                      timestamp: new Date()
                    }}
                    headerColor={headerColor}
                    isStreaming={true}
                  />
                )}
              </Box>
            )
          })}
          
          {/* 브랜치 추천 표시 - 모든 노드 타입에서 표시 */}
          {(() => {
            const currentMessages = messages.filter(m => m.branchId === currentBranchId)
            const recommendations = getRecommendations(currentBranchId, currentMessages.length)
            const recommendationData = useRecommendationStore.getState().recommendations[currentBranchId]
            const isStale = recommendationData?.isStale || false
            const isDismissed = isRecommendationDismissed(currentBranchId)
            
            // 추천이 있으면 항상 표시 (숨김 처리된 경우에도 딤드로 표시)
            return recommendations.length > 0 && (
              <BranchRecommendations
                recommendations={recommendations}
                parentNodeId={currentBranchId}
                isStale={isStale}
                isDimmed={isDismissed}  // 숨김 처리된 경우 딤드로 표시
              onBranchesCreated={(branches) => {
                // 브랜치가 생성되면 첫 번째 브랜치로 이동
                if (branches.length > 0) {
                  switchBranch(branches[0].id)
                }
              }}
              onDismiss={() => {
                // 숨기기 버튼을 눌렀을 때 해당 노드의 추천을 숨김
                dismissRecommendations(currentBranchId)
              }}
            />
            )
          })()}
        </List>
        
        {/* 로딩 인디케이터 - 현재 노드에서만 표시 */}
        {isLoading && streamingNodeId === currentBranchId && (
          <Box sx={{ 
            px: 3, 
            py: 2, 
            display: 'flex', 
            alignItems: 'center',
            gap: 2,
            backgroundColor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider'
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              AI가 응답을 생성하고 있습니다...
            </Typography>
          </Box>
        )}
        
        {/* 입력 영역 */}
        <ChatInput
          input={input}
          attachments={attachments}
          headerColor={headerColor}
          disabled={isSummaryNode && currentBranch?.isGenerating}  // 요약 노드가 생성 중일 때만 비활성화
          onInputChange={handleInputChange}
          onSend={handleSend}
          onAttachFile={handleFileAttach}
          onRemoveAttachment={handleRemoveAttachment}
          onOpenVectorSearch={() => setShowVectorSearch(true)}
          onOpenSummary={() => setSummaryDialogOpen(true)}
          onDownload={handleDownload}
        />
      </Paper>
      
      {/* 모달들 */}
      <VectorSearchModal
        open={showVectorSearch}
        onClose={() => {
          setShowVectorSearch(false)
          setVectorSearchInitialQuery('')
        }}
        branches={branches}
        onSelectNode={handleVectorSearchSelect}
        onCreateSummaryAndReference={handleVectorSearchSummary}
        initialQuery={vectorSearchInitialQuery}
      />
      
      <SummaryDialog
        open={summaryDialogOpen}
        onClose={() => {
          setSummaryDialogOpen(false)
          setSelectedNodesForSummary([])
        }}
        branches={branches}
        selectedNodes={selectedNodesForSummary}
        onCreateSummary={handleCreateSummary}
      />
    </Box>
  )
}

export default ConversationPanel