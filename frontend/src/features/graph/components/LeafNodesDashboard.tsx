import React, { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ViewCompactIcon from '@mui/icons-material/ViewCompact'
import ViewStreamIcon from '@mui/icons-material/ViewStream'
import { useConversationStore, Branch } from '@store/conversationStore'
import { borderRadius, uiColors, getNodeTypeColor } from '@shared/theme'
import { NodeTypeChip } from '@shared/components'

interface LeafNodesDashboardProps {
  onNodeClick: (nodeId: string) => void
}

const LeafNodesDashboard: React.FC<LeafNodesDashboardProps> = ({
  onNodeClick,
}) => {
  const { branches, currentBranchId, switchBranch } = useConversationStore()
  const [isCompact, setIsCompact] = useState(false)

  // 리프 노드 필터링 (완료된 노드 제외, 머지 노드 포함)
  const leafNodes = useMemo(() => {
    // 모든 노드의 자식 찾기
    const hasChildren = new Set<string>()
    branches.forEach(branch => {
      if (branch.parentId) {
        hasChildren.add(branch.parentId)
      }
      if (branch.parentIds) {
        branch.parentIds.forEach(id => hasChildren.add(id))
      }
    })

    // 리프 노드 필터링
    return branches.filter(branch => {
      // 자식이 있으면 리프 노드가 아님
      if (hasChildren.has(branch.id)) return false
      
      // 완료된 노드 제외
      if (branch.status === 'completed') return false
      
      return true
    }).sort((a, b) => {
      // 깊이로 정렬, 같은 깊이면 최근 업데이트 순
      if (a.depth !== b.depth) return b.depth - a.depth
      const aTime = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0
      const bTime = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0
      return bTime - aTime
    })
  }, [branches])

  const handleNodeClick = (nodeId: string) => {
    switchBranch(nodeId)
    onNodeClick(nodeId)
  }

  return (
    <Accordion 
      sx={{ 
        backgroundColor: 'background.paper',
        borderRadius: borderRadius.md,
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        mt: 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 48,
          '& .MuiAccordionSummary-content': {
            margin: '8px 0',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <DashboardIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1 }}>
            활성 리프 노드
          </Typography>
          <Badge 
            badgeContent={leafNodes.length} 
            color="error"
            sx={{
              mr: 1,
              '& .MuiBadge-badge': {
                fontSize: '10px',
                height: 16,
                minWidth: 16,
              }
            }}
          >
            <Box />
          </Badge>
        </Box>
      </AccordionSummary>
      
      <AccordionDetails sx={{ p: 0 }}>
        {/* 컴팩트 토글 */}
        <Box sx={{ px: 2, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title={isCompact ? "확장 보기" : "컴팩트 보기"}>
            <IconButton
              size="small"
              onClick={() => setIsCompact(!isCompact)}
              sx={{ p: 0.5 }}
            >
              {isCompact ? <ViewStreamIcon sx={{ fontSize: 16 }} /> : <ViewCompactIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* 노드 리스트 */}
        <Box
          sx={{
            maxHeight: 400,
            overflow: 'auto',
            px: 2,
            pb: 2,
          }}
        >
        {leafNodes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: uiColors.textMuted }}>
              활성 리프 노드가 없습니다
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {leafNodes.map((node) => {
              const isCurrent = node.id === currentBranchId
              
              return (
                <Paper
                  key={node.id}
                  elevation={isCurrent ? 2 : 0}
                  onClick={() => handleNodeClick(node.id)}
                  sx={{
                    p: isCompact ? 0.75 : 1,
                    borderRadius: borderRadius.md,
                    border: '1px solid',
                    borderColor: isCurrent ? 'primary.main' : 'divider',
                    backgroundColor: isCurrent ? 'action.selected' : 'background.paper',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.light',
                      transform: 'translateY(-1px)',
                      boxShadow: 1,
                      backgroundColor: isCurrent ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  {/* 노드 헤더 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: isCompact ? '0.75rem' : '0.8rem',
                        color: isCurrent ? 'primary.main' : 'text.primary'
                      }}
                    >
                      {node.title}
                    </Typography>
                    {isCurrent && (
                      <Chip
                        label="현재"
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '10px' }}
                      />
                    )}
                  </Box>

                  {/* 컴팩트 모드: 기본 정보만 */}
                  {isCompact && (
                    <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
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
                        M{node.messages.length} • D{node.depth}
                      </Typography>
                      {node.status === 'paused' && (
                        <Chip
                          label="⏸"
                          size="small"
                          sx={{ height: 16, fontSize: '10px', minWidth: 20 }}
                        />
                      )}
                    </Box>
                  )}

                  {/* 확장 모드: 상세 정보 */}
                  {!isCompact && (
                    <>
                      {/* 타입과 상태 */}
                      <Box sx={{ mt: 0.75, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Chip
                          label={node.type === 'merge' ? '머지' : node.type}
                          size="small"
                          sx={{ 
                            height: 18, 
                            fontSize: '10px',
                            backgroundColor: `${getNodeTypeColor(node.type)}20`,
                            color: getNodeTypeColor(node.type),
                          }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          메시지 {node.messages.length} • 깊이 {node.depth}
                          {node.tokenCount ? ` • ${node.tokenCount}토큰` : ''}
                        </Typography>
                        {node.status === 'paused' && (
                          <Chip
                            label="일시정지"
                            size="small"
                            color="warning"
                            sx={{ height: 18, fontSize: '10px' }}
                          />
                        )}
                      </Box>

                      {/* 요약 또는 설명 */}
                      {(node.summary || node.description) && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            color: uiColors.textSecondary,
                            fontSize: '0.75rem',
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
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
                            {node.keyPoints.slice(0, 3).map((point, idx) => (
                              <Chip
                                key={idx}
                                label={point}
                                size="small"
                                sx={{
                                  backgroundColor: 'action.hover',
                                  fontSize: '10px',
                                  height: 18,
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </Paper>
              )
            })}
          </Box>
        )}
        </Box>
        
        {/* 푸터 */}
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
            총 {leafNodes.length}개의 활성 브랜치 • {leafNodes.filter(n => n.status === 'active').length}개 진행 중 • {leafNodes.filter(n => n.isMerge).length}개 머지
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export default LeafNodesDashboard