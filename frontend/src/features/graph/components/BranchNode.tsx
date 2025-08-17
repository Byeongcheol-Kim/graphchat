import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Box, Typography, Chip, Paper, IconButton } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import ExploreIcon from '@mui/icons-material/Explore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'

interface BranchNodeData {
  label: string
  type: 'main' | 'topic' | 'exploration' | 'question' | 'solution'
  status: 'active' | 'paused' | 'completed'
  messageCount: number
  depth: number
  description?: string
  isAncestor?: boolean
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'main': return <AccountTreeIcon />
    case 'topic': return <AutoGraphIcon />
    case 'exploration': return <ExploreIcon />
    case 'question': return <QuestionMarkIcon />
    case 'solution': return <LightbulbIcon />
    default: return <ChatBubbleOutlineIcon />
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <PlayCircleIcon sx={{ color: '#4CAF50' }} />
    case 'paused': return <PauseCircleIcon sx={{ color: '#FF9800' }} />
    case 'completed': return <CheckCircleIcon sx={{ color: '#2196F3' }} />
    default: return null
  }
}

const getNodeColor = (type: string) => {
  switch (type) {
    case 'main': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    case 'topic': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    case 'exploration': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    case 'question': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    case 'solution': return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
}

const BranchNode: React.FC<NodeProps<BranchNodeData>> = ({ data, selected }) => {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#fff',
          width: 8,
          height: 8,
          border: '2px solid #667eea',
        }}
      />
      
      <Paper
        elevation={selected ? 10 : data.isAncestor ? 6 : 3}
        sx={{
          background: getNodeColor(data.type),
          borderRadius: 3,
          border: selected 
            ? '3px solid #fff' 
            : data.isAncestor 
              ? '2px solid rgba(102, 126, 234, 0.8)'
              : '1px solid rgba(255,255,255,0.3)',
          padding: 2,
          minWidth: 200,
          maxWidth: 250,
          transition: 'all 0.3s ease',
          transform: selected 
            ? 'scale(1.1)' 
            : data.isAncestor 
              ? 'scale(1.02)'
              : 'scale(1)',
          cursor: 'pointer',
          opacity: data.isAncestor ? 1 : 0.85,
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          },
          position: 'relative',
          '&::before': data.isAncestor ? {
            content: '""',
            position: 'absolute',
            top: -5,
            left: -5,
            right: -5,
            bottom: -5,
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%)',
            borderRadius: 3,
            zIndex: -1,
          } : {},
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* 헤더 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
              {getTypeIcon(data.type)}
              <Typography variant="subtitle1" fontWeight="bold" color="white">
                {data.label}
              </Typography>
            </Box>
            {getStatusIcon(data.status)}
          </Box>
          
          {/* 설명 */}
          {data.description && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              {data.description}
            </Typography>
          )}
          
          {/* 통계 */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              icon={<ChatBubbleOutlineIcon />}
              label={`${data.messageCount} 메시지`}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
            <Chip
              size="small"
              label={`깊이 ${data.depth}`}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
              }}
            />
          </Box>
        </Box>
      </Paper>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#fff',
          width: 8,
          height: 8,
          border: '2px solid #667eea',
        }}
      />
    </>
  )
}

export default memo(BranchNode)