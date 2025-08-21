import React from 'react'
import {
  Box,
  Typography,
  Chip,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import ExploreIcon from '@mui/icons-material/Explore'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import MergeTypeIcon from '@mui/icons-material/MergeType'
import LinkIcon from '@mui/icons-material/Link'
import HomeIcon from '@mui/icons-material/Home'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { NodeTypeChip } from '@shared/components'
import { NodeType, Branch } from '@/types'

const getNodeIcon = (type?: NodeType) => {
  const iconProps = { sx: { fontSize: 14, mr: 0.4 } }
  switch (type) {
    case 'root': return <HomeIcon {...iconProps} />
    case 'main': return <AccountTreeIcon {...iconProps} />
    case 'topic': return <AutoGraphIcon {...iconProps} />
    case 'exploration': return <ExploreIcon {...iconProps} />
    case 'question': return <QuestionMarkIcon {...iconProps} />
    case 'solution': return <LightbulbIcon {...iconProps} />
    case 'summary': return <MergeTypeIcon {...iconProps} />
    case 'reference': return <LinkIcon {...iconProps} />
    default: return <ChatBubbleOutlineIcon {...iconProps} />
  }
}

interface ChatHeaderProps {
  currentBranch: Branch | undefined
  parentBranches: Branch[]
  parentBranch: Branch | null
  headerColor: string
  // onDownload: () => void
  onSwitchBranch: (branchId: string) => void
  // onOpenVectorSearch: () => void
  // onOpenSummary: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentBranch,
  parentBranches,
  parentBranch,
  headerColor,
  // onDownload,
  onSwitchBranch,
  // onOpenVectorSearch,
  // onOpenSummary,
}) => {
  
  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        background: `linear-gradient(135deg, ${headerColor}10, ${headerColor}05)`,
        borderTop: `2px solid ${headerColor}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getNodeIcon(currentBranch?.type)}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: headerColor, fontSize: '0.95rem' }}>
            {currentBranch?.title || '대화'}
          </Typography>
        </Box>
      </Box>
      
      {/* 브랜치 정보 */}
      <Box sx={{ display: 'flex', gap: 0.4, mt: 0.4, alignItems: 'center', flexWrap: 'wrap' }}>
        {currentBranch && (
          <NodeTypeChip type={currentBranch.type} size="small" sx={{ height: 18, '& .MuiChip-label': { fontSize: '10px', px: 1 } }} />
        )}
        
        {/* 머지 노드인 경우 부모 노드들 표시 */}
        {parentBranches.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              •
            </Typography>
            {parentBranches.map((parent: any, index: number) => (
              <React.Fragment key={parent.id}>
                <Chip
                  label={parent.title}
                  size="small"
                  sx={{
                    cursor: 'pointer',
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: `${headerColor}10`,
                    '&:hover': {
                      bgcolor: `${headerColor}20`,
                    },
                  }}
                  onClick={() => onSwitchBranch(parent.id)}
                />
                {index < parentBranches.length - 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    +
                  </Typography>
                )}
              </React.Fragment>
            ))}
          </>
        )}
        
        {/* 일반 노드의 부모 표시 */}
        {parentBranch && !((currentBranch as any)?.isSummary || (currentBranch as any)?.isReference) && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              ←
            </Typography>
            <Chip
              label={parentBranch.title}
              size="small"
              sx={{
                cursor: 'pointer',
                height: 20,
                fontSize: '0.7rem',
                bgcolor: `${headerColor}10`,
                '&:hover': {
                  bgcolor: `${headerColor}20`,
                },
              }}
              onClick={() => onSwitchBranch(parentBranch.id)}
            />
          </>
        )}
      </Box>
    </Box>
  )
}