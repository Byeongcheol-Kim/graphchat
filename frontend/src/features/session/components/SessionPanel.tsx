import React, { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useSessionStore } from '@store/sessionStore'
import { useConversationStore } from '@store/conversationStore'
import { Session } from '@/types'
import { uiColors } from '@shared/theme'

interface SessionPanelProps {
  open: boolean
  onClose: () => void
}

const SessionPanel: React.FC<SessionPanelProps> = ({ open, onClose }) => {
  console.log('[SessionPanel] 컴포넌트 렌더링, open:', open)
  const {
    sessions,
    currentSession,
    isLoading,
    error,
    loadSessions,
    loadSession,
    createSession,
    deleteSession,
    updateSession,
  } = useSessionStore()

  const { clearStore } = useConversationStore()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionDescription, setNewSessionDescription] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // SessionPanel은 더 이상 사용되지 않음 - GraphToolbar의 드롭다운으로 대체
  // 세션 목록은 GraphToolbar에서만 로드하도록 함
  useEffect(() => {
    console.log('SessionPanel open 상태:', open)
    // loadSessions()를 제거하여 중복 호출 방지
  }, [open])

  // 세션 선택 처리
  const handleSelectSession = async (sessionId: string) => {
    if (currentSession?.id === sessionId) return
    
    try {
      // 기존 스토어 초기화
      clearStore()
      // 새 세션 로드
      await loadSession(sessionId)
      onClose()
    } catch (error) {
      console.error('세션 로드 실패:', error)
    }
  }

  // 새 세션 생성
  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) return
    
    try {
      await createSession(newSessionTitle, newSessionDescription)
      setCreateDialogOpen(false)
      setNewSessionTitle('')
      setNewSessionDescription('')
      onClose()
    } catch (error) {
      console.error('세션 생성 실패:', error)
    }
  }

  // 세션 삭제
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return
    
    try {
      await deleteSession(sessionToDelete)
      setDeleteConfirmOpen(false)
      setSessionToDelete(null)
      
      // 현재 세션을 삭제한 경우 다른 세션으로 전환
      if (currentSession?.id === sessionToDelete) {
        const remainingSessions = sessions.filter(s => s.id !== sessionToDelete)
        if (remainingSessions.length > 0) {
          await loadSession(remainingSessions[0].id)
        } else {
          // 세션이 없으면 새로 생성
          await createSession('새 세션')
        }
      }
    } catch (error) {
      console.error('세션 삭제 실패:', error)
    }
  }

  // 세션 이름 수정
  const handleEditSession = async (sessionId: string) => {
    if (!editTitle.trim()) return
    
    try {
      await updateSession(sessionId, { title: editTitle })
      setEditingSession(null)
      setEditTitle('')
    } catch (error) {
      console.error('세션 업데이트 실패:', error)
    }
  }

  if (!open) {
    console.log('[SessionPanel] open이 false여서 null 반환')
    return null
  }

  console.log('[SessionPanel] 렌더링 시작, sessions:', sessions)
  
  return (
    <>
      {/* 오버레이 - 패널 외부 클릭 시 닫기 */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1199,
        }}
      />
      
      {/* 세션 패널 */}
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          width: 280,
          maxHeight: 'calc(100vh - 32px)',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: uiColors.backgroundPrimary,
        }}
      >
        {/* 헤더 - 더 컴팩트하게 */}
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${uiColors.borderLight}`,
            backgroundColor: uiColors.backgroundSecondary,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '14px' }}>
            세션 목록
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <Tooltip title="새 세션">
              <IconButton size="small" onClick={() => setCreateDialogOpen(true)} sx={{ padding: '4px' }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="새로고침">
              <IconButton size="small" onClick={loadSessions} sx={{ padding: '4px' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="닫기">
              <IconButton size="small" onClick={onClose} sx={{ padding: '4px' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 세션 목록 - 더 컴팩트한 스타일 */}
        <Box sx={{ flex: 1, overflow: 'auto', maxHeight: '400px' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 1.5 }}>
              <Typography color="error" variant="caption">
                {error}
              </Typography>
            </Box>
          ) : sessions.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                세션이 없습니다
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mt: 1, fontSize: '12px' }}
              >
                첫 세션 만들기
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 0, '& .MuiListItem-root': { py: 0 } }}>
              {sessions.map((session) => {
                const isActive = currentSession?.id === session.id
                const isEditing = editingSession === session.id

                return (
                  <ListItem
                    key={session.id}
                    disablePadding
                    sx={{
                      backgroundColor: isActive ? `${uiColors.primary}15` : undefined,
                      borderLeft: isActive ? `3px solid ${uiColors.primary}` : '3px solid transparent',
                      '&:hover': {
                        backgroundColor: isActive ? `${uiColors.primary}15` : uiColors.backgroundSecondary,
                      },
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 0.25, pr: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingSession(session.id)
                            setEditTitle(session.title)
                          }}
                          sx={{ padding: '3px' }}
                        >
                          <EditIcon sx={{ fontSize: '14px' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSessionToDelete(session.id)
                            setDeleteConfirmOpen(true)
                          }}
                          sx={{ padding: '3px' }}
                        >
                          <DeleteIcon sx={{ fontSize: '14px' }} />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemButton 
                      onClick={() => handleSelectSession(session.id)}
                      sx={{ py: 1, px: 1.5 }}
                    >
                      <ListItemText
                        primary={
                          isEditing ? (
                            <TextField
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditSession(session.id)
                                } else if (e.key === 'Escape') {
                                  setEditingSession(null)
                                  setEditTitle('')
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              size="small"
                              autoFocus
                              fullWidth
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: '13px',
                                  padding: '2px 6px',
                                },
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '13px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {session.title}
                            </Typography>
                          )
                        }
                        secondary={
                          !isEditing && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                              <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                                노드 {session.node_count || 0}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                                •
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                                {format(new Date(session.updated_at), 'MM/dd HH:mm', { locale: ko })}
                              </Typography>
                            </Box>
                          )
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          )}
        </Box>

        {/* 새 세션 생성 다이얼로그 */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: '12px',
              minWidth: '320px',
            }
          }}
        >
          <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>새 세션 만들기</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="세션 이름"
              fullWidth
              variant="outlined"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              size="small"
              sx={{ mb: 1.5 }}
            />
            <TextField
              margin="dense"
              label="설명 (선택사항)"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={newSessionDescription}
              onChange={(e) => setNewSessionDescription(e.target.value)}
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)} size="small">취소</Button>
            <Button onClick={handleCreateSession} variant="contained" size="small">
              생성
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog 
          open={deleteConfirmOpen} 
          onClose={() => setDeleteConfirmOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: '12px',
            }
          }}
        >
          <DialogTitle sx={{ fontSize: '16px', fontWeight: 600 }}>세션 삭제</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ fontSize: '14px' }}>
              이 세션을 삭제하시겠습니까? 모든 노드와 메시지가 삭제됩니다.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} size="small">취소</Button>
            <Button onClick={handleDeleteSession} color="error" variant="contained" size="small">
              삭제
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </>
  )
}

export default SessionPanel