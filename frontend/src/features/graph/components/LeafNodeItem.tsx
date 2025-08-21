import React from 'react'
import { Box, Paper, Typography, Chip } from '@mui/material'
import { Branch } from '@store/conversationStore'
import { borderRadius, uiColors } from '@shared/theme'

interface LeafNodeItemProps {
  node: Branch
  isCurrent: boolean
  getNodeTypeColor: (type: string) => string
  onClick: (nodeId: string) => void
}

const LeafNodeItem: React.FC<LeafNodeItemProps> = React.memo(({
  node,
  isCurrent,
  getNodeTypeColor,
  onClick,
}) => {
  return (
    <Paper
      elevation={isCurrent ? 2 : 0}
      onClick={() => onClick(node.id)}
      sx={{
        p: 0.75,
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: isCurrent ? getNodeTypeColor('main') : 'divider',
        backgroundColor: isCurrent ? 'action.selected' : 'background.paper',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: getNodeTypeColor('topic'),
          transform: 'translateY(-1px)',
          boxShadow: 1,
          backgroundColor: isCurrent ? 'action.selected' : 'action.hover',
        },
      }}
    >
      {/* 노드 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 500,
            fontSize: '11px',
            color: isCurrent ? getNodeTypeColor('main') : 'text.primary'
          }}
        >
          {node.title}
        </Typography>
        {isCurrent && (
          <Chip
            label="현재"
            size="small"
            color="primary"
            sx={{ height: 16, fontSize: '9px' }}
          />
        )}
      </Box>

      {/* 상세 정보 */}
      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.25, alignItems: 'center' }}>
        <Chip
          label={node.type === 'merge' ? '머지' : node.type}
          size="small"
          sx={{ 
            height: 16, 
            fontSize: '9px',
            backgroundColor: `${getNodeTypeColor(node.type)}20`,
            color: getNodeTypeColor(node.type),
          }}
        />
        <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
          메시지 {node.messages?.length || 0} • 깊이 {node.depth || 0}
          {node.tokenCount ? ` • ${node.tokenCount}토큰` : ''}
        </Typography>
        {node.status === 'paused' && (
          <Chip
            label="일시정지"
            size="small"
            color="warning"
            sx={{ height: 16, fontSize: '9px' }}
          />
        )}
      </Box>

      {/* 요약 또는 설명 */}
      {(node.summary || node.description) && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            color: uiColors.textSecondary,
            fontSize: '10px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {node.summary || node.description}
        </Typography>
      )}
      
      {/* 주요 포인트 */}
      {node.keyPoints && node.keyPoints.length > 0 && (
        <Box sx={{ mt: 0.5 }}>
          <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
            {node.keyPoints.slice(0, 3).map((point, idx) => (
              <Chip
                key={idx}
                label={point}
                size="small"
                sx={{
                  backgroundColor: 'action.hover',
                  fontSize: '9px',
                  height: 16,
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  )
})

LeafNodeItem.displayName = 'LeafNodeItem'

export default LeafNodeItem