import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Collapse,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material'
import { api } from '@/services/api'

interface BranchRecommendation {
  id?: string
  title: string
  type: string
  description: string
  priority: number
  estimated_depth: number
  edge_label: string
  status?: 'pending' | 'created' | 'dismissed' | 'expired'
  created_branch_id?: string
}

interface BranchRecommendationsProps {
  recommendations: BranchRecommendation[]
  parentNodeId: string
  onBranchesCreated?: (branches: any[]) => void
  onDismiss?: () => void
  compact?: boolean  // 컴팩트 모드 옵션
  isStale?: boolean  // 오래된 추천인지 표시
  isDimmed?: boolean  // 딤드 처리 여부
}

const BranchRecommendations: React.FC<BranchRecommendationsProps> = ({
  recommendations,
  parentNodeId,
  onBranchesCreated,
  onDismiss,
  compact = true,  // 기본값을 컴팩트 모드로
  isStale = false,  // 기본값은 오래되지 않음
  isDimmed = false,  // 기본값은 딤드 처리 안함
}) => {
  const [expanded, setExpanded] = useState(true)  // 기본적으로 확장된 상태
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())  // 개별 아이템 확장 상태
  const [isCreating, setIsCreating] = useState(false)
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null)
  const [createdBranches, setCreatedBranches] = useState<Set<number>>(new Set())
  
  // 백엔드에서 가져온 추천의 상태를 확인해서 이미 생성된 브랜치 표시
  React.useEffect(() => {
    const created = new Set<number>()
    recommendations.forEach((branch, index) => {
      // status가 created이거나 created_branch_id가 있으면 생성된 것으로 표시
      if (branch.status === 'created' || branch.created_branch_id) {
        created.add(index)
      }
    })
    
    // isStale이면 모두 생성된 것으로 표시
    if (isStale) {
      recommendations.forEach((_, index) => created.add(index))
    }
    
    setCreatedBranches(created)
  }, [isStale, recommendations])

  // 개별 아이템 확장 토글
  const toggleItemExpanded = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()  // 부모 클릭 이벤트 방지
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // 브랜치 클릭 시 바로 생성
  const handleCreateBranch = async (branch: BranchRecommendation, index: number) => {
    // 이미 생성된 브랜치는 클릭 무시
    if (isCreating || createdBranches.has(index)) return

    setIsCreating(true)
    setCreatingIndex(index)
    
    try {
      const response = await api.post('/api/v1/messages/create-branches', {
        parent_node_id: parentNodeId,
        branches: [{
          ...branch,
          edge_label: branch.edge_label || branch.title.substring(0, 20)
        }],
      })

      // 엣지 레이블 저장
      if (response.data.branches && response.data.branches.length > 0) {
        const { useSessionStore } = await import('@/store/sessionStore')
        const sessionStore = useSessionStore.getState()
        
        const createdBranch = response.data.branches[0]
        const edgeId = `${parentNodeId}-${createdBranch.id}`
        sessionStore.updateEdgeLabel(edgeId, branch.edge_label || branch.title.substring(0, 20))
        
        // 생성된 브랜치 인덱스 저장
        setCreatedBranches(prev => new Set(prev).add(index))
        
        // 백엔드에 브랜치 생성 완료 알림 (추천 ID가 있는 경우)
        if (branch.id) {
          try {
            const { recommendationService } = await import('@/services/recommendationService')
            await recommendationService.markAsCreated(branch.id, createdBranch.id)
            console.log(`추천 ${branch.id}를 생성 완료로 표시`)
          } catch (error) {
            console.error('추천 상태 업데이트 실패:', error)
            // 실패해도 계속 진행
          }
        }
      }

      if (onBranchesCreated) {
        onBranchesCreated(response.data.branches)
      }
    } catch (error) {
      console.error('브랜치 생성 실패:', error)
    } finally {
      setIsCreating(false)
      setCreatingIndex(null)
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      topics: '#66BB6A',
      details: '#42A5F5',
      alternatives: '#FFA726',
      questions: '#AB47BC',
      examples: '#26C6DA',
    }
    return colors[type] || '#9E9E9E'
  }

  if (recommendations.length === 0) return null

  return (
    <Card sx={{ 
      mb: 1, 
      backgroundColor: isDimmed ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.01)', 
      border: '1px solid', 
      borderColor: isDimmed ? 'action.disabled' : 'divider',
      boxShadow: 'none',
      opacity: isDimmed ? 0.6 : 1,
      transition: 'opacity 0.3s',
    }}>
      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="space-between"
          sx={{ cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <IconButton size="small" sx={{ p: 0.25 }}>
              <ExpandMoreIcon 
                sx={{ 
                  fontSize: '1rem',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} 
              />
            </IconButton>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              브랜치 추천 ({recommendations.length}) {isDimmed && '(숨김)'}
            </Typography>
          </Box>
          {onDismiss && (
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              sx={{ p: 0.25 }}
              title={isDimmed ? "다시 표시" : "숨기기"}
            >
              <CloseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          )}
        </Box>

        <Collapse in={expanded}>
          <List dense sx={{ mt: 0.5, p: 0 }}>
            {recommendations.map((branch, index) => {
              const isCreated = createdBranches.has(index)
              const isCurrentlyCreating = creatingIndex === index
              const isItemExpanded = expandedItems.has(index)
              
              return (
                <ListItem
                  key={index}
                  disablePadding
                  sx={{ 
                    mb: 0.5,
                    backgroundColor: isCreated ? 'action.disabledBackground' : 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: isCreated ? 'action.disabled' : 'divider',
                    opacity: isCreated ? 0.7 : 1,
                  }}
                >
                  <ListItemButton
                    onClick={() => !isCreated && !isCreating && handleCreateBranch(branch, index)}
                    disabled={isCreated || isCreating}
                    sx={{ 
                      py: 0.5, 
                      px: 1,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: isCreated ? 'action.disabledBackground' : 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      {isCurrentlyCreating ? (
                        <CircularProgress size={16} />
                      ) : isCreated ? (
                        <CheckCircleIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                      )}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              flex: 1,
                              fontSize: '0.875rem',
                              textDecoration: isCreated ? 'line-through' : 'none',
                            }}
                          >
                            {branch.title}
                          </Typography>
                          <Chip
                            label={branch.type}
                            size="small"
                            sx={{
                              backgroundColor: getTypeColor(branch.type),
                              color: 'white',
                              fontSize: '0.6rem',
                              height: '16px',
                              '& .MuiChip-label': { px: 0.5 }
                            }}
                          />
                          {branch.description && (
                            <IconButton 
                              size="small" 
                              onClick={(e) => toggleItemExpanded(index, e)}
                              sx={{ p: 0.25 }}
                            >
                              <ChevronRightIcon 
                                sx={{ 
                                  fontSize: '1rem',
                                  transform: isItemExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s'
                                }} 
                              />
                            </IconButton>
                          )}
                        </Box>
                      }
                      secondary={
                        <Collapse in={isItemExpanded}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              display: 'block',
                              mt: 0.5,
                              fontSize: '0.75rem',
                              lineHeight: 1.4,
                            }}
                          >
                            {branch.description}
                          </Typography>
                        </Collapse>
                      }
                      sx={{ my: 0 }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Collapse>
      </CardContent>
    </Card>
  )
}

export default BranchRecommendations