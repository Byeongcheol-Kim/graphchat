import { useEffect } from 'react'
import websocketService from '@/services/websocketService'
import { useMessageStore } from '@/store/messageStore'
import { useRecommendationStore } from '@/store/recommendationStore'
import { useNodeStore } from '@/store/nodeStore'

export const useWebSocketEvents = (currentBranchId: string | null) => {
  const {
    startStreaming,
    appendStreamChunk,
    endStreaming,
  } = useMessageStore()
  
  const { setRecommendations } = useRecommendationStore()
  const nodeStore = useNodeStore()
  
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
        
        // 브랜치 추천 처리
        if (data.recommended_branches && data.recommended_branches.length > 0) {
          // 현재 메시지 개수를 가져와서 저장
          // 실제 메시지 개수는 컴포넌트에서 전달받아야 함
          setRecommendations(currentBranchId, data.recommended_branches, 0)
        }
      }
    })
    
    // 에러 처리
    const unsubError = websocketService.on('error', (error: any) => {
      console.error('[WebSocket Error]:', error)
      if (error.node_id === currentBranchId) {
        endStreaming('', null)
      }
    })
    
    // 노드 삭제 이벤트 처리 - 주석 처리 (nodeStore에서 직접 처리하므로 중복)
    const unsubNodeDeleted = websocketService.on('node_deleted', (data: any) => {
      console.log('[WebSocket] 노드 삭제 이벤트 수신:', data)
      // nodeStore.deleteNodes에서 이미 처리하므로 여기서는 처리하지 않음
      // 중복 처리로 인한 문제 방지
    })
    
    // 여러 노드 삭제 이벤트 처리 - 주석 처리 (nodeStore에서 직접 처리하므로 중복)
    const unsubNodesDeleted = websocketService.on('nodes_deleted', (data: any) => {
      console.log('[WebSocket] 여러 노드 삭제 이벤트 수신:', data)
      // nodeStore.deleteNodes에서 이미 처리하므로 여기서는 처리하지 않음
      // 중복 처리로 인한 문제 방지
    })
    
    // 정리
    return () => {
      unsubStreamStart()
      unsubStreamChunk()
      unsubStreamEnd()
      unsubError()
      unsubNodeDeleted()
      unsubNodesDeleted()
    }
  }, [currentBranchId, startStreaming, appendStreamChunk, endStreaming, setRecommendations, nodeStore])
}