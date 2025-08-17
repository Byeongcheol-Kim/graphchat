import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Chip,
  IconButton,
  Collapse,
  Paper,
  Button,
  LinearProgress,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SearchIcon from '@mui/icons-material/Search'
import { NodeTypeChip } from '@shared/components'
import { borderRadius, uiColors, fontSize } from '@shared/theme'
import { Branch } from '@store/conversationStore'

interface SearchResult {
  branch: Branch
  similarity: number // 0-1 사이의 유사도 점수
  highlights: string[] // 관련 텍스트 하이라이트
}

interface VectorSearchModalProps {
  open: boolean
  onClose: () => void
  initialQuery?: string
  branches: Branch[]
  onSelectNode: (nodeId: string) => void
  onCreateSummaryAndReference?: (nodeIds: string[]) => void
}

const VectorSearchModal: React.FC<VectorSearchModalProps> = ({
  open,
  onClose,
  initialQuery = '',
  branches,
  onSelectNode,
  onCreateSummaryAndReference,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setSearchQuery(initialQuery)
      setSearchResults([])
      setHasSearched(false)
      setSelectedNodes(new Set())
      setExpandedItems(new Set())
    }
  }, [open, initialQuery])
  
  // 검색 수행
  const performSearch = () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    
    // 검색 시뮬레이션 (실제로는 백엔드 API 호출)
    setTimeout(() => {
      const results = branches
        .filter(b => b.messages.length > 0)
        .map(branch => {
          // 검색어와의 관련성 계산 (더미)
          const titleMatch = branch.title.toLowerCase().includes(searchQuery.toLowerCase())
          const descMatch = branch.description?.toLowerCase().includes(searchQuery.toLowerCase())
          const summaryMatch = branch.summary?.toLowerCase().includes(searchQuery.toLowerCase())
          
          const baseScore = Math.random() * 0.4 + 0.3 // 0.3 ~ 0.7
          const bonus = (titleMatch ? 0.2 : 0) + (descMatch ? 0.1 : 0) + (summaryMatch ? 0.1 : 0)
          
          return {
            branch,
            similarity: Math.min(baseScore + bonus, 1),
            highlights: [
              branch.summary || branch.description,
              ...(branch.keyPoints || []).slice(0, 2)
            ].filter(Boolean)
          }
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
      
      setSearchResults(results)
      setIsSearching(false)
      setHasSearched(true)
    }, 800) // 검색 시뮬레이션 딜레이
  }

  const handleToggleExpand = (nodeId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleToggleSelect = (nodeId: string) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleApplySelection = () => {
    if (selectedNodes.size > 0) {
      // 선택한 노드들로 요약 생성 및 참조
      if (onCreateSummaryAndReference) {
        onCreateSummaryAndReference(Array.from(selectedNodes))
      } else {
        // 폴백: 첫 번째 노드로 이동
        const firstNodeId = Array.from(selectedNodes)[0]
        onSelectNode(firstNodeId)
      }
    }
    onClose()
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.8) return '#10b981'
    if (similarity > 0.6) return '#3b82f6'
    if (similarity > 0.4) return '#f59e0b'
    return '#6b7280'
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: borderRadius.lg,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box>
          <Typography variant="h6">벡터 검색</Typography>
          <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
            {hasSearched 
              ? `"${searchQuery}"에 대한 상위 ${searchResults.length}개 결과`
              : '검색어를 입력하여 관련 노드를 찾아보세요'
            }
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {/* 검색 입력 영역 */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                performSearch()
              }
            }}
            placeholder="검색할 내용을 입력하세요..."
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: isSearching && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: borderRadius.lg,
              },
            }}
          />
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={performSearch}
              disabled={!searchQuery.trim() || isSearching}
              startIcon={<SearchIcon />}
              sx={{ borderRadius: borderRadius.md }}
            >
              검색
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchQuery('')
                setSearchResults([])
                setHasSearched(false)
              }}
              disabled={isSearching}
              sx={{ borderRadius: borderRadius.md }}
            >
              초기화
            </Button>
          </Box>
          
          {/* 검색 힌트 */}
          {!hasSearched && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: uiColors.textMuted, display: 'block', mb: 1 }}>
                검색 예시:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {['AI 윤리', '기술 구현', '편향성', 'Transformer'].map((example) => (
                  <Chip
                    key={example}
                    label={example}
                    size="small"
                    onClick={() => {
                      setSearchQuery(example)
                      setTimeout(() => performSearch(), 100)
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
        
        {/* 검색 결과 영역 */}
        {hasSearched && (
          <List sx={{ p: 0 }}>
            {searchResults.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: uiColors.textMuted, mb: 2 }}>
                  검색 결과가 없습니다
                </Typography>
                <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
                  다른 검색어를 시도해보세요
                </Typography>
              </Box>
            ) : (
              searchResults.map((result, index) => {
            const isExpanded = expandedItems.has(result.branch.id)
            const isSelected = selectedNodes.has(result.branch.id)
            
                return (
                  <Paper
                key={result.branch.id}
                elevation={0}
                sx={{
                  borderBottom: index < searchResults.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  backgroundColor: isSelected ? 'action.selected' : 'transparent',
                }}
              >
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton 
                        size="small"
                        onClick={() => handleToggleSelect(result.branch.id)}
                        color={isSelected ? 'primary' : 'default'}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => handleToggleExpand(result.branch.id)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  }
                  sx={{ pr: 12 }}
                >
                  <ListItemButton
                    onClick={() => handleToggleExpand(result.branch.id)}
                    sx={{ 
                      borderRadius: borderRadius.sm,
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      {/* 노드 정보 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          #{index + 1}
                        </Typography>
                        <NodeTypeChip
                          label={result.branch.title}
                          nodeType={result.branch.type}
                          size="small"
                        />
                        <Chip
                          icon={<TrendingUpIcon />}
                          label={`${(result.similarity * 100).toFixed(1)}%`}
                          size="small"
                          sx={{
                            backgroundColor: `${getSimilarityColor(result.similarity)}20`,
                            borderColor: getSimilarityColor(result.similarity),
                            color: getSimilarityColor(result.similarity),
                            border: '1px solid',
                          }}
                        />
                      </Box>
                      
                      {/* 요약 */}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: uiColors.textSecondary,
                          mb: 1,
                        }}
                      >
                        {result.branch.summary || result.branch.description}
                      </Typography>
                      
                      {/* 유사도 바 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: uiColors.textMuted, minWidth: 50 }}>
                          유사도
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={result.similarity * 100}
                          sx={{
                            flexGrow: 1,
                            height: 6,
                            borderRadius: borderRadius.xs,
                            backgroundColor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getSimilarityColor(result.similarity),
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
                
                {/* 확장된 내용 */}
                <Collapse in={isExpanded}>
                  <Box sx={{ px: 3, pb: 2 }}>
                    {/* 하이라이트된 텍스트 */}
                    {result.highlights.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ color: uiColors.textMuted, fontWeight: 600 }}>
                          관련 내용:
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {result.highlights.map((highlight, idx) => (
                            <Paper
                              key={idx}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                backgroundColor: 'grey.50',
                                borderLeft: '3px solid',
                                borderColor: getSimilarityColor(result.similarity),
                              }}
                            >
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                "{highlight}"
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {/* 주요 포인트 */}
                    {result.branch.keyPoints && result.branch.keyPoints.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ color: uiColors.textMuted, fontWeight: 600 }}>
                          주요 포인트:
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {result.branch.keyPoints.map((point, idx) => (
                            <Chip
                              key={idx}
                              label={point}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {/* 메타데이터 */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
                        메시지: {result.branch.messages.length}개
                      </Typography>
                      {result.branch.tokenCount && (
                        <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
                          토큰: {result.branch.tokenCount}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
                        깊이: {result.branch.depth}
                      </Typography>
                    </Box>
                  </Box>
                </Collapse>
              </Paper>
                )
              })
            )}
          </List>
        )}
        
      {/* 액션 버튼 */}
      {hasSearched && selectedNodes.size > 0 && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'background.paper',
        }}>
          <Typography variant="body2" sx={{ color: uiColors.textSecondary }}>
            {selectedNodes.size}개 노드 선택됨
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setSelectedNodes(new Set())}>
              선택 취소
            </Button>
            <Button variant="contained" onClick={handleApplySelection}>
              {selectedNodes.size > 1 ? '선택한 노드 요약 생성' : '선택한 노드로 이동'}
            </Button>
          </Box>
        </Box>
      )}
      </DialogContent>
    </Dialog>
  )
}

export default VectorSearchModal