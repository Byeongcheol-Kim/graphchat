import React, { useRef, useEffect } from 'react'
import { List, Box, Typography, Divider, IconButton, Collapse, CircularProgress } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { MessageItem } from './MessageItem'
import { Message, Branch } from '@/types'
import { uiColors } from '@shared/theme'

interface MessageListProps {
  messages: Message[]
  currentBranch: Branch | undefined
  streamingContent: string
  streamingNodeId: string | null
  currentBranchId: string | null
  expandedParentNodes: Set<string>
  loadingParentMessages: Set<string>
  parentMessagesCache: Record<string, Message[]>
  onToggleParentNode: (nodeId: string) => void
  onDeleteMessage: (messageId: string) => void
  onToggleBranchPoint: (messageId: string) => void
  onEditMessage: (messageId: string, content: string) => void
  onCreateSummary: () => void
  onOpenVectorSearch: (query: string) => void
}

const MessageList: React.FC<MessageListProps> = React.memo(({
  messages,
  currentBranch,
  streamingContent,
  streamingNodeId,
  currentBranchId,
  expandedParentNodes,
  loadingParentMessages,
  parentMessagesCache,
  onToggleParentNode,
  onDeleteMessage,
  onToggleBranchPoint,
  onEditMessage,
  onCreateSummary,
  onOpenVectorSearch,
}) => {
  const listRef = useRef<HTMLUListElement>(null)
  
  // 메시지가 추가되거나 스트리밍될 때 스크롤
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, streamingContent])
  
  // 부모 노드의 메시지를 그룹화하여 렌더링
  const renderParentMessages = (branch: Branch) => {
    const parentId = branch.parentId || (branch as any).parent_id
    if (!parentId) return null
    
    const isExpanded = expandedParentNodes.has(parentId)
    const isLoading = loadingParentMessages.has(parentId)
    const cachedMessages = parentMessagesCache[parentId]
    
    return (
      <Box key={`parent-${parentId}`} sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            backgroundColor: uiColors.background.secondary,
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={() => onToggleParentNode(parentId)}
        >
          <IconButton size="small">
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Typography variant="caption" sx={{ color: uiColors.text.secondary }}>
            이전 대화 내용 {cachedMessages ? `(${cachedMessages.length}개 메시지)` : ''}
          </Typography>
          {isLoading && <CircularProgress size={16} />}
        </Box>
        
        <Collapse in={isExpanded && !isLoading}>
          {cachedMessages && (
            <Box sx={{ pl: 2, opacity: 0.7 }}>
              {cachedMessages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onDelete={() => {}} // 부모 메시지는 수정/삭제 불가
                  onToggleBranchPoint={() => {}}
                  onEdit={() => {}}
                  onCreateSummary={() => {}}
                  onVectorSearch={() => {}}
                  isStreaming={false}
                  streamingContent=""
                  disabled // 부모 메시지는 상호작용 비활성화
                />
              ))}
            </Box>
          )}
        </Collapse>
        
        <Divider sx={{ my: 2 }} />
      </Box>
    )
  }
  
  return (
    <List
      ref={listRef}
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        px: 2,
        py: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: uiColors.background.secondary,
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: uiColors.border.default,
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: uiColors.text.disabled,
          },
        },
      }}
    >
      {/* 부모 노드 메시지 표시 */}
      {currentBranch && renderParentMessages(currentBranch)}
      
      {/* 현재 노드 메시지 */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onDelete={onDeleteMessage}
          onToggleBranchPoint={onToggleBranchPoint}
          onEdit={onEditMessage}
          onCreateSummary={onCreateSummary}
          onVectorSearch={onOpenVectorSearch}
          isStreaming={streamingNodeId === currentBranchId && !message.content}
          streamingContent={streamingContent}
        />
      ))}
      
      {/* 스트리밍 중인 메시지 (임시) */}
      {streamingNodeId === currentBranchId && streamingContent && (
        <MessageItem
          message={{
            id: 'streaming',
            content: '',
            role: 'assistant',
            timestamp: new Date().toISOString(),
          }}
          onDelete={() => {}}
          onToggleBranchPoint={() => {}}
          onEdit={() => {}}
          onCreateSummary={() => {}}
          onVectorSearch={() => {}}
          isStreaming={true}
          streamingContent={streamingContent}
        />
      )}
    </List>
  )
})

MessageList.displayName = 'MessageList'

export default MessageList