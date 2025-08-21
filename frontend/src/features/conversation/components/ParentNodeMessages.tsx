import React from 'react'
import { Box, Typography, IconButton, Collapse, CircularProgress } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { MessageItem } from './MessageItem'
import { Message, Branch } from '@/types'

interface ParentNodeMessagesProps {
  parentNode: Branch
  index: number
  isExpanded: boolean
  isLoading: boolean
  messages: Message[]
  onToggleExpansion: (nodeId: string) => void
  getNodeTypeColor: (type: string) => string
}

const ParentNodeMessages: React.FC<ParentNodeMessagesProps> = React.memo(({
  parentNode,
  index,
  isExpanded,
  isLoading,
  messages,
  onToggleExpansion,
  getNodeTypeColor,
}) => {
  return (
    <Box>
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
        onClick={() => onToggleExpansion(parentNode.id)}
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
          {isLoading ? '로딩 중...' : `메시지 ${messages.length}개`}
        </Typography>
        {isLoading && <CircularProgress size={12} sx={{ mr: 0.5 }} />}
        <IconButton size="small" sx={{ p: 0.25 }}>
          {isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>
      
      {/* 부모 노드의 메시지들 */}
      <Collapse in={isExpanded && !isLoading}>
        <Box sx={{ pl: 2, pr: 1, opacity: 0.8 }}>
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onDelete={() => {}}
              onToggleBranchPoint={() => {}}
              onEdit={() => {}}
              onCreateSummary={() => {}}
              onVectorSearch={() => {}}
              isStreaming={false}
              streamingContent=""
              disabled // 부모 노드 메시지는 읽기 전용
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  )
})

ParentNodeMessages.displayName = 'ParentNodeMessages'

export default ParentNodeMessages