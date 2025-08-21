import React, { useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useConversationStore } from '@store/conversationStore'
import { borderRadius, uiColors } from '@shared/theme'
import { useThemeColor } from '@shared/hooks/useThemeColor'
import LeafNodeItem from './LeafNodeItem'

interface LeafNodesDashboardProps {
  onNodeClick: (nodeId: string) => void
}

const LeafNodesDashboard: React.FC<LeafNodesDashboardProps> = React.memo(({
  onNodeClick,
}) => {
  const { branches, currentBranchId, switchBranch } = useConversationStore()
  const { getNodeTypeColor } = useThemeColor()

  // 리프 노드 필터링 (완료된 노드 제외, 요약 노드 포함)
  const leafNodes = useMemo(() => {
    // 모든 노드의 자식 찾기
    const hasChildren = new Set<string>()
    branches.forEach(branch => {
      // 일반 부모 체크
      if (branch.parentId) {
        hasChildren.add(branch.parentId)
      }
      // 요약 노드의 소스들 체크 (parentIds 또는 sourceNodeIds)
      const sourceIds = (branch as any).sourceNodeIds || (branch as any).parentIds
      if (sourceIds) {
        sourceIds.forEach(id => hasChildren.add(id))
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
      
      // Date 객체로 변환
      const getTimeValue = (date: any) => {
        if (!date) return 0
        if (date instanceof Date) return date.getTime()
        if (typeof date === 'string') return new Date(date).getTime()
        return 0
      }
      
      const aTime = getTimeValue(a.updatedAt) || getTimeValue(a.createdAt) || 0
      const bTime = getTimeValue(b.updatedAt) || getTimeValue(b.createdAt) || 0
      return bTime - aTime
    })
  }, [branches])

  const handleNodeClick = useCallback((nodeId: string) => {
    switchBranch(nodeId)
    onNodeClick(nodeId)
  }, [switchBranch, onNodeClick])

  return (
    <Accordion 
      sx={{ 
        backgroundColor: uiColors.backgroundPrimary,
        borderRadius: '12px',
        '&:before': { display: 'none' },
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: `1px solid ${uiColors.borderLight}`,
        mt: 0.5,
        minWidth: 280,
        width: 280,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: '16px' }} />}
        sx={{
          minHeight: '36px !important',
          backgroundColor: uiColors.backgroundSecondary,
          borderRadius: '12px',
          '&.Mui-expanded': {
            minHeight: '36px',
            borderRadius: '12px 12px 0 0',
          },
          '& .MuiAccordionSummary-content': {
            margin: '6px 0',
            '&.Mui-expanded': {
              margin: '6px 0',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <DashboardIcon sx={{ color: getNodeTypeColor('main'), fontSize: '16px' }} />
          <Typography sx={{ fontWeight: 600, flexGrow: 1, fontSize: '12px' }}>
            활성 리프 노드
          </Typography>
          <Badge 
            badgeContent={leafNodes.length} 
            color="error"
            sx={{
              mr: 1.5,
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
      
      <AccordionDetails sx={{ p: 0, borderRadius: '0 0 12px 12px' }}>
        {/* 노드 리스트 */}
        <Box
          sx={{
            maxHeight: 260,
            overflow: 'auto',
            px: 0.75,
            py: 0.75,
          }}
        >
        {leafNodes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 1.5 }}>
            <Typography sx={{ color: uiColors.textMuted, fontSize: '11px' }}>
              활성 리프 노드가 없습니다
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {leafNodes.map((node) => (
              <LeafNodeItem
                key={node.id}
                node={node}
                isCurrent={node.id === currentBranchId}
                getNodeTypeColor={getNodeTypeColor}
                onClick={handleNodeClick}
              />
            ))}
          </Box>
        )}
        </Box>
        
        {/* 푸터 */}
        <Box
          sx={{
            px: 1,
            py: 0.5,
            borderTop: `1px solid ${uiColors.borderLight}`,
            backgroundColor: uiColors.backgroundSecondary,
            borderRadius: '0 0 12px 12px',
          }}
        >
          <Typography sx={{ color: uiColors.textMuted, fontSize: '10px' }}>
            총 {leafNodes.length}개 • 진행 {leafNodes.filter(n => n.status === 'active').length}개 • 머지 {leafNodes.filter(n => n.isMerge).length}개
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
})

LeafNodesDashboard.displayName = 'LeafNodesDashboard'

export default LeafNodesDashboard