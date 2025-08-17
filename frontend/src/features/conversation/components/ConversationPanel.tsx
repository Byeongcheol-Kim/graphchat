import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Fade,
  Avatar,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  Collapse,
  Button,
  FormControl,
  Select,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import HubIcon from '@mui/icons-material/Hub'
import ExtensionIcon from '@mui/icons-material/Extension'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import HistoryIcon from '@mui/icons-material/History'
import MergeTypeIcon from '@mui/icons-material/MergeType'
import { useConversationStore, Branch } from '@store/conversationStore'
import { getNodeTypeColor, uiColors, borderRadius, messageStyles } from '@shared/theme'
import { NodeTypeChip, StatusChip } from '@shared/components'
import VectorSearchModal from './VectorSearchModal'
import SummaryDialog from '../../graph/components/SummaryDialog'

interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
}

const ConversationPanel: React.FC = () => {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [showVectorSearch, setShowVectorSearch] = useState(false)
  const [vectorSearchInitialQuery, setVectorSearchInitialQuery] = useState('')
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [selectedNodesForSummary, setSelectedNodesForSummary] = useState<string[]>([])
  const { messages, currentBranchId, branches, addMessage, switchBranch, createSummaryNode, createReferenceNode, settings, updateSettings } = useConversationStore()
  const listRef = useRef<HTMLUListElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const currentBranch = branches.find(b => b.id === currentBranchId)
  const headerColor = getNodeTypeColor(currentBranch?.type)
  
  // 머지 노드인 경우 부모 노드들 찾기
  const parentBranches = currentBranch?.isMerge && currentBranch.parentIds 
    ? currentBranch.parentIds.map(id => branches.find(b => b.id === id)).filter(Boolean)
    : []
    
  // 부모 노드 찾기 (일반 노드의 경우)
  const parentBranch = currentBranch?.parentId 
    ? branches.find(b => b.id === currentBranch.parentId)
    : null
    
  // 현재 노드의 메시지만 필터링
  const currentNodeMessages = currentBranch?.messages || []
  
  // 노드 확장 토글
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }
  
  // 부모/참조 노드들 가져오기
  const getContextNodes = () => {
    const contextNodes: Branch[] = []
    
    if (currentBranch?.isMerge && currentBranch.parentIds) {
      // 머지 노드의 경우 참조 노드들
      currentBranch.parentIds.forEach(parentId => {
        const parent = branches.find(b => b.id === parentId)
        if (parent) {
          contextNodes.push(parent)
        }
      })
    } else if (parentBranch) {
      // 일반 노드의 경우 부모 체인
      let current = parentBranch
      const ancestors: Branch[] = []
      
      while (current) {
        ancestors.unshift(current)
        current = current.parentId ? branches.find(b => b.id === current.parentId) : undefined
      }
      
      contextNodes.push(...ancestors)
    }
    
    return contextNodes
  }
  
  const contextNodes = getContextNodes()
  
  // 메시지 리스트 자동 스크롤
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // 파일 업로드 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    
    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: `file_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file)
    }))
    
    setAttachments(prev => [...prev, ...newAttachments])
    
    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  
  // 액션 메뉴 열기/닫기
  const handleActionsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setActionsMenuAnchor(event.currentTarget)
  }
  
  const handleActionsMenuClose = () => {
    setActionsMenuAnchor(null)
  }
  
  // 벡터 검색 액션 핸들러
  const handleVectorSearchAction = () => {
    handleActionsMenuClose()
    // 현재 입력된 텍스트를 초기 쿼리로 설정
    setVectorSearchInitialQuery(input.trim())
    setShowVectorSearch(true)
  }
  
  // 지식 그래프 액션 핸들러 (미래 구현용)
  const handleKnowledgeGraphAction = () => {
    handleActionsMenuClose()
    // TODO: 지식 그래프 통합 기능
    console.log('Knowledge Graph integration - coming soon')
  }
  
  // 플러그인 액션 핸들러 (미래 구현용)
  const handlePluginAction = () => {
    handleActionsMenuClose()
    // TODO: 플러그인 시스템
    console.log('Plugin system - coming soon')
  }

  const handleSend = () => {
    if (!input.trim()) return

    // 사용자 메시지 추가 (첨부 파일 포함)
    const messageContent = attachments.length > 0
      ? `${input}\n\n첨부 파일: ${attachments.map(a => a.name).join(', ')}`
      : input
      
    addMessage({
      content: messageContent,
      role: 'user',
      branchId: currentBranchId,
    })
    
    // 입력 및 첨부 파일 초기화
    setInput('')
    setAttachments([])
    
    // 더미 AI 응답 생성
    // addMessage가 자식 노드를 생성할 수 있으므로, 
    // 최신 currentBranchId를 가져와야 함
    setTimeout(() => {
      const responses = [
        '흥미로운 질문입니다. 더 자세히 탐구해보겠습니다.',
        '이 주제에 대해 여러 관점이 있습니다. 어떤 측면을 더 알아보고 싶으신가요?',
        '좋은 지적입니다. 이를 기반으로 새로운 브랜치를 생성할 수 있습니다.',
        '이 부분은 별도의 깊은 논의가 필요할 것 같습니다.',
      ]
      
      // 최신 상태에서 currentBranchId 가져오기
      const store = useConversationStore.getState()
      addMessage({
        content: responses[Math.floor(Math.random() * responses.length)],
        role: 'assistant',
        branchId: store.currentBranchId,
      })
    }, 1000)
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 헤더 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
          background: `linear-gradient(135deg, ${headerColor}30 0%, ${headerColor}15 100%)`,
          borderBottom: '3px solid',
          borderColor: headerColor,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeIcon sx={{ color: headerColor }} />
          <Typography variant="h6" sx={{ color: uiColors.textPrimary, fontWeight: 600 }}>
            현재 브랜치
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          <NodeTypeChip
            label={currentBranch?.title || '선택되지 않음'}
            nodeType={currentBranch?.type}
            size="small"
          />
          <Chip
            label={currentBranch?.type || ''}
            size="small"
            variant="outlined"
            sx={{
              borderColor: uiColors.textMuted,
              color: uiColors.textSecondary,
              borderRadius: borderRadius.md,
            }}
          />
          {currentBranch?.status && (
            <StatusChip
              label={currentBranch.status}
              status={currentBranch.status}
              size="small"
            />
          )}
        </Box>
        {/* 머지 노드인 경우 부모 노드들 표시 */}
        {currentBranch?.isMerge && parentBranches.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ color: uiColors.textMuted, mb: 0.5, display: 'block' }}>
              요약된 노드들:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {parentBranches.map((parent: any) => (
                <Chip
                  key={parent.id}
                  label={parent.title}
                  size="small"
                  sx={{
                    backgroundColor: `${getNodeTypeColor(parent.type)}20`,
                    borderColor: getNodeTypeColor(parent.type),
                    color: getNodeTypeColor(parent.type),
                    borderRadius: borderRadius.sm,
                    border: '1px solid',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      <Divider />

      
      {/* 메시지 목록 */}
      <List
        ref={listRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: uiColors.backgroundPrimary,
        }}
      >
        {/* 부모/참조 컨텍스트 노드별 표시 */}
        {contextNodes.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {contextNodes.map((contextNode) => {
              const isExpanded = expandedNodes.has(contextNode.id)
              const nodeColor = getNodeTypeColor(contextNode.type)
              const isParent = currentBranch?.parentId === contextNode.id
              const isReference = currentBranch?.parentIds?.includes(contextNode.id)
              
              return (
                <Box key={contextNode.id} sx={{ mb: 1 }}>
                  {/* 노드 헤더 */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      backgroundColor: uiColors.backgroundSecondary,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: uiColors.backgroundTertiary,
                      },
                    }}
                    onClick={() => toggleNodeExpansion(contextNode.id)}
                    onDoubleClick={() => switchBranch(contextNode.id)}
                  >
                    <IconButton size="small" sx={{ p: 0.5 }}>
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                    
                    <Chip
                      icon={isReference ? <MergeTypeIcon /> : <HistoryIcon />}
                      label={`${isReference ? '참조' : '이전'}: ${contextNode.title}`}
                      size="small"
                      sx={{
                        ml: 1,
                        backgroundColor: `${nodeColor}20`,
                        borderColor: nodeColor,
                        border: '1px solid',
                      }}
                    />
                    
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 'auto',
                        mr: 1,
                        color: uiColors.textMuted,
                      }}
                    >
                      메시지 {contextNode.messages.length}개
                    </Typography>
                    
                    <Typography
                      variant="caption"
                      sx={{
                        color: uiColors.textMuted,
                        fontStyle: 'italic',
                      }}
                    >
                      (더블클릭으로 이동)
                    </Typography>
                  </Box>
                  
                  {/* 노드 메시지 */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ 
                      mt: 1,
                      ml: 4,
                      opacity: 0.8,
                      borderLeft: '3px solid',
                      borderColor: nodeColor,
                      pl: 2,
                    }}>
                      {contextNode.messages.map((message) => {
                        const branchColor = getNodeTypeColor(contextNode.type)
                        
                        return (
                          <ListItem
                            key={message.id}
                            sx={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                              mb: 1,
                              gap: 1,
                              p: 0.5,
                            }}
                          >
                            {message.role === 'assistant' && (
                              <Avatar
                                sx={{
                                  bgcolor: branchColor,
                                  width: 24,
                                  height: 24,
                                }}
                              >
                                <SmartToyIcon sx={{ fontSize: 14 }} />
                              </Avatar>
                            )}
                            
                            <Box sx={{ maxWidth: '70%' }}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 1,
                                  backgroundColor:
                                    message.role === 'user'
                                      ? 'grey.200'
                                      : 'grey.100',
                                  borderRadius: message.role === 'user' 
                                    ? messageStyles.borderRadius.user 
                                    : messageStyles.borderRadius.assistant,
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    color: 'text.secondary',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {message.content}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    display: 'block',
                                    mt: 0.5,
                                    opacity: 0.7,
                                    color: uiColors.textTertiary,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {message.timestamp.toLocaleTimeString()}
                                </Typography>
                              </Paper>
                            </Box>
                            
                            {message.role === 'user' && (
                              <Avatar
                                sx={{
                                  bgcolor: 'grey.400',
                                  width: 24,
                                  height: 24,
                                }}
                              >
                                <PersonIcon sx={{ fontSize: 14 }} />
                              </Avatar>
                            )}
                          </ListItem>
                        )
                      })}
                    </Box>
                  </Collapse>
                </Box>
              )
            })}
          </Box>
        )}
        
        {/* 현재 노드 구분선 */}
        {contextNodes.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              my: 2,
            }}
          >
            <Divider sx={{ flex: 1 }} />
            <Chip
              icon={<AccountTreeIcon />}
              label={`현재 노드: ${currentBranch?.title}`}
              size="small"
              sx={{
                mx: 2,
                backgroundColor: 'primary.main',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
            <Divider sx={{ flex: 1 }} />
          </Box>
        )}
        
        {/* 현재 노드의 메시지 */}
        {currentNodeMessages.map((message) => {
          // 현재 노드의 일반 메시지 처리
          const messageBranch = branches.find(b => b.id === message.branchId)
          const branchColor = getNodeTypeColor(messageBranch?.type)
          
          return (
            <Fade in={true} timeout={500} key={message.id}>
              <ListItem
                sx={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                  gap: 1,
                }}
              >
                {message.role === 'assistant' && (
                  <Avatar
                    sx={{
                      bgcolor: branchColor,
                      width: 32,
                      height: 32,
                    }}
                  >
                    <SmartToyIcon fontSize="small" />
                  </Avatar>
                )}
                
                <Box sx={{ maxWidth: '70%' }}>
                  {/* 브랜치 라벨 */}
                  {messageBranch && message.role === 'assistant' && (
                    <NodeTypeChip
                      label={messageBranch.title}
                      nodeType={messageBranch.type}
                      size="small"
                      sx={{
                        height: '20px',
                        fontSize: '10px',
                        mb: 0.5,
                      }}
                    />
                  )}
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor:
                      message.role === 'user'
                        ? 'primary.main'
                        : uiColors.backgroundTertiary,
                    borderRadius: message.role === 'user' 
                      ? messageStyles.borderRadius.user 
                      : messageStyles.borderRadius.assistant,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            color: message.role === 'user' ? 'white' : uiColors.textPrimary,
                            fontWeight: 400
                          }}
                        >
                          {message.content}
                        </Typography>
                        {/* 첨부 파일 표시 */}
                        {message.content.includes('첨부 파일:') && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {message.content
                              .split('첨부 파일:')[1]
                              ?.split(',')
                              .map((fileName, idx) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName.trim())
                                return (
                                  <Chip
                                    key={idx}
                                    icon={isImage ? <ImageIcon /> : <InsertDriveFileIcon />}
                                    label={fileName.trim()}
                                    size="small"
                                    sx={{
                                      backgroundColor: 'rgba(255,255,255,0.2)',
                                      color: message.role === 'user' ? 'white' : uiColors.textSecondary,
                                    }}
                                  />
                                )
                              })}
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          opacity: message.role === 'user' ? 0.9 : 0.7,
                          color: message.role === 'user' ? 'white' : uiColors.textTertiary
                        }}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                    }
                  />
                </Paper>
                </Box>
                
                {message.role === 'user' && (
                  <Avatar
                    sx={{
                      bgcolor: uiColors.textSecondary,
                      width: 32,
                      height: 32,
                    }}
                  >
                    <PersonIcon fontSize="small" />
                  </Avatar>
                )}
              </ListItem>
            </Fade>
          )
        })}
      </List>

      <Divider />

      {/* 입력 영역 */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: uiColors.backgroundSecondary,
        borderTop: '2px solid',
        borderColor: uiColors.borderLight,
        borderRadius: `0 0 ${borderRadius.lg} ${borderRadius.lg}`,
      }}>
        {/* 첨부 파일 표시 */}
        {attachments.length > 0 && (
          <Box sx={{ mb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {attachments.map(file => (
              <Chip
                key={file.id}
                icon={file.type.startsWith('image/') ? <ImageIcon /> : <InsertDriveFileIcon />}
                label={file.name}
                size="small"
                onDelete={() => setAttachments(prev => prev.filter(f => f.id !== file.id))}
                sx={{
                  backgroundColor: uiColors.backgroundTertiary,
                  borderRadius: borderRadius.sm,
                }}
              />
            ))}
          </Box>
        )}
        
        {/* 입력 영역 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* 텍스트 입력 */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            multiline
            minRows={2}
            maxRows={8}
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: borderRadius.lg,
              },
            }}
          />
          
          {/* 하단 컨트롤 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* 왼쪽: 파일 첨부, 액션 메뉴, 모델 선택 */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
          />
          
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            size="small"
            sx={{
              backgroundColor: uiColors.backgroundTertiary,
              borderRadius: borderRadius.md,
              '&:hover': {
                backgroundColor: uiColors.backgroundPrimary,
              }
            }}
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
          
          <IconButton
            onClick={handleActionsMenuOpen}
            size="small"
            sx={{
              backgroundColor: 'primary.light',
              borderRadius: borderRadius.md,
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.main',
              }
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          
          {/* 모델 선택 */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={settings.aiModel}
              onChange={(e) => updateSettings({ aiModel: e.target.value as any })}
              sx={{
                borderRadius: borderRadius.md,
                fontSize: '0.875rem',
                '& .MuiSelect-select': {
                  py: 0.5,
                },
              }}
            >
              <MenuItem value="gpt-4">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10a37f' }} />
                  GPT-4
                </Box>
              </MenuItem>
              <MenuItem value="gpt-3.5">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10a37f' }} />
                  GPT-3.5
                </Box>
              </MenuItem>
              <MenuItem value="claude-3">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d4a373' }} />
                  Claude 3
                </Box>
              </MenuItem>
              <MenuItem value="gemini-pro">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4285f4' }} />
                  Gemini Pro
                </Box>
              </MenuItem>
              <MenuItem value="llama-2">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#5e3c99' }} />
                  Llama 2
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
            </Box>
            
            {/* 오른쪽: 전송 버튼 */}
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!input.trim()}
              endIcon={<SendIcon />}
              sx={{
                borderRadius: borderRadius.md,
                textTransform: 'none',
                px: 3,
              }}
            >
              전송
            </Button>
          </Box>
        </Box>
      </Box>
      
      {/* 벡터 검색 모달 */}
      <VectorSearchModal
        open={showVectorSearch}
        onClose={() => setShowVectorSearch(false)}
        initialQuery={vectorSearchInitialQuery}
        branches={branches}
        onSelectNode={(nodeId) => {
          switchBranch(nodeId)
          setShowVectorSearch(false)
        }}
        onCreateSummaryAndReference={(nodeIds) => {
          // 벡터 검색 결과들을 요약하고 참조 노드 생성
          if (nodeIds.length > 0) {
            if (nodeIds.length > 1) {
              // 여러 개 선택: 요약 다이얼로그 열기
              setSelectedNodesForSummary(nodeIds)
              setSummaryDialogOpen(true)
            } else {
              // 하나만 선택: 바로 참조 노드 생성
              const targetNodeId = createReferenceNode(nodeIds)
              if (targetNodeId) {
                switchBranch(targetNodeId)
              }
            }
          }
          setShowVectorSearch(false)
        }}
      />
      
      {/* 액션 메뉴 */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={handleActionsMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            borderRadius: borderRadius.lg,
            minWidth: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }
        }}
      >
        <MenuItem onClick={handleVectorSearchAction}>
          <ListItemIcon>
            <SearchIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">벡터 검색</Typography>
        </MenuItem>
        
        <MenuItem onClick={handleKnowledgeGraphAction} disabled>
          <ListItemIcon>
            <HubIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">지식 그래프</Typography>
          <Chip 
            label="Soon" 
            size="small" 
            sx={{ ml: 'auto', height: 18, fontSize: '10px' }}
          />
        </MenuItem>
        
        <MenuItem onClick={handlePluginAction} disabled>
          <ListItemIcon>
            <ExtensionIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">플러그인</Typography>
          <Chip 
            label="Soon" 
            size="small" 
            sx={{ ml: 'auto', height: 18, fontSize: '10px' }}
          />
        </MenuItem>
        
        <Divider sx={{ my: 0.5 }} />
        
        <MenuItem disabled>
          <ListItemIcon>
            <AutoAwesomeIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">AI 제안</Typography>
          <Chip 
            label="Pro" 
            size="small" 
            color="primary"
            sx={{ ml: 'auto', height: 18, fontSize: '10px' }}
          />
        </MenuItem>
      </Menu>
      
      {/* 요약 다이얼로그 (벡터 검색 결과용) */}
      <SummaryDialog
        open={summaryDialogOpen}
        onClose={() => {
          setSummaryDialogOpen(false)
          setSelectedNodesForSummary([])
        }}
        selectedNodes={selectedNodesForSummary}
        branches={branches}
        onCreateSummary={(nodeIds, instructions) => {
          if (nodeIds && nodeIds.length > 0) {
            // 요약 노드 생성
            const summaryNodeId = createSummaryNode(nodeIds, instructions)
            if (summaryNodeId) {
              // 참조 노드 생성
              const targetNodeId = createReferenceNode([summaryNodeId])
              if (targetNodeId) {
                switchBranch(targetNodeId)
              }
            }
          }
          setSummaryDialogOpen(false)
          setSelectedNodesForSummary([])
        }}
      />
    </Box>
  )
}

export default ConversationPanel