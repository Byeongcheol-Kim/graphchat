import React, { useState, useEffect, useRef } from 'react'
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  TextField, 
  Divider, 
  Collapse, 
  Select, 
  MenuItem, 
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import DeleteIcon from '@mui/icons-material/Delete'
import { StyledButton, StyledPanel, StyledChip } from '@shared/components'
import { uiColors } from '@shared/theme'
import SessionPanel from '../../session/components/SessionPanel'
import { useSessionStore } from '@store/sessionStore'

interface GraphToolbarProps {
  sessionName: string
  updateSessionName: (name: string) => void
  createNewSession: () => void
  globalExpanded: boolean
  setGlobalExpanded: (expanded: boolean) => void
  leafNodesCount: number
  nodeCount: number
  edgeCount: number
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const GraphToolbar: React.FC<GraphToolbarProps> = React.memo(({
  sessionName,
  updateSessionName,
  createNewSession,
  globalExpanded,
  setGlobalExpanded,
  leafNodesCount,
  nodeCount,
  edgeCount,
  collapsed,
  setCollapsed,
}) => {
  console.log('[GraphToolbar] 렌더링, sessionName:', sessionName)
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<string | null>(null)
  const [editSessionName, setEditSessionName] = useState('')
  const sessions = useSessionStore(state => state.sessions)
  const currentSession = useSessionStore(state => state.currentSession)
  const sessionsLoaded = useSessionStore(state => state.sessionsLoaded)
  const loadSessions = useSessionStore(state => state.loadSessions)
  const loadSession = useSessionStore(state => state.loadSession)
  const deleteSession = useSessionStore(state => state.deleteSession)
  const updateSession = useSessionStore(state => state.updateSession)
  
  // 세션 목록 로드 - store의 sessionsLoaded 상태 확인
  useEffect(() => {
    if (!sessionsLoaded) {
      console.log('[GraphToolbar] 세션 목록 로드 시작')
      loadSessions()
    }
  }, [sessionsLoaded, loadSessions]) // sessionsLoaded와 loadSessions를 의존성으로 추가
  
  const handleSessionChange = async (sessionId: string) => {
    if (sessionId === 'new') {
      createNewSession()
    } else if (sessionId !== currentSession?.id) {
      await loadSession(sessionId)
    }
  }
  
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return
    
    try {
      const wasCurrentSession = currentSession?.id === sessionToDelete
      
      // 세션 삭제
      await deleteSession(sessionToDelete)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
      
      // 세션 목록 강제 리로드 (sessionsLoaded를 false로 설정하여 다시 로드하도록)
      useSessionStore.setState({ sessionsLoaded: false })
      await loadSessions()
      
      // 현재 세션을 삭제한 경우 다른 세션으로 전환 또는 새 세션 생성
      if (wasCurrentSession) {
        const updatedSessions = useSessionStore.getState().sessions
        if (updatedSessions.length > 0) {
          // 첫 번째 세션으로 전환
          await loadSession(updatedSessions[0].id)
        } else {
          // 세션이 없으면 새 세션 생성
          createNewSession()
        }
      }
    } catch (error) {
      console.error('세션 삭제 실패:', error)
    }
  }
  
  const handleEditSession = async () => {
    if (!sessionToEdit || !editSessionName.trim()) return
    
    try {
      await updateSession(sessionToEdit, { title: editSessionName })
      setEditDialogOpen(false)
      setSessionToEdit(null)
      setEditSessionName('')
      
      // 현재 세션의 이름이 변경된 경우 업데이트
      if (currentSession?.id === sessionToEdit) {
        updateSessionName(editSessionName)
      }
      
      // 세션 목록 다시 로드
      await loadSessions()
    } catch (error) {
      console.error('세션 업데이트 실패:', error)
    }
  }

  return (
    <>
    <StyledPanel
      position="top-left"
      style={{
        padding: collapsed ? '6px' : '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: collapsed ? '6px' : '10px',
        minWidth: collapsed ? 'auto' : '260px',
        maxWidth: '360px',
        transition: 'all 0.3s ease',
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        borderRadius: '12px',
        backgroundColor: uiColors.backgroundPrimary,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        {!collapsed && (
          <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
            <Select
              value={currentSession?.id || ''}
              onChange={(e) => handleSessionChange(e.target.value)}
              displayEmpty
              IconComponent={() => null}
              sx={{
                fontSize: '13px',
                height: '32px',
                backgroundColor: uiColors.backgroundSecondary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: uiColors.borderLight,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: uiColors.primary,
                },
                '& .MuiSelect-select': {
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
            >
              {sessions.map((session) => (
                <MenuItem 
                  key={session.id} 
                  value={session.id}
                  sx={{ fontSize: '13px', position: 'relative' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', pr: 6 }}>
                    <Typography sx={{ fontSize: '13px', flex: 1 }}>
                      {session.title}
                    </Typography>
                    {session.id === currentSession?.id && (
                      <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                        (현재)
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ 
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: 0.25
                  }}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSessionToEdit(session.id)
                        setEditSessionName(session.title)
                        setEditDialogOpen(true)
                      }}
                      sx={{ 
                        p: 0.25,
                        '&:hover': {
                          color: 'primary.main',
                        }
                      }}
                    >
                      <EditIcon sx={{ fontSize: '14px' }} />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSessionToDelete(session.id)
                        setDeleteDialogOpen(true)
                      }}
                      sx={{ 
                        p: 0.25,
                        '&:hover': {
                          color: 'error.main',
                        }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: '14px' }} />
                    </IconButton>
                  </Box>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem value="new" sx={{ fontSize: '13px', color: uiColors.primary }}>
                <AddIcon sx={{ fontSize: '16px', mr: 0.5 }} />
                새 세션 만들기
              </MenuItem>
            </Select>
          </FormControl>
        )}
        
        <Box display="flex" gap={0.25}>
          <Tooltip title="초기 위치로">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation()
                console.log('초기 위치로 버튼 클릭')
                // TODO: 그래프 초기 위치로 이동하는 로직 구현
                // window.location.reload() 대신 그래프 리셋 로직 필요
              }}
              sx={{ color: uiColors.textSecondary, padding: '6px' }}
            >
              <RestartAltIcon sx={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={globalExpanded ? "모두 축소" : "모두 확장"}>
            <IconButton 
              size="small" 
              onClick={() => setGlobalExpanded(!globalExpanded)}
              sx={{ color: uiColors.textSecondary, padding: '6px' }}
            >
              {globalExpanded ? <UnfoldLessIcon sx={{ fontSize: '18px' }} /> : <UnfoldMoreIcon sx={{ fontSize: '18px' }} />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={collapsed ? "패널 확장" : "패널 축소"}>
            <IconButton 
              size="small" 
              onClick={() => setCollapsed(!collapsed)}
              sx={{ color: uiColors.textSecondary, padding: '6px' }}
            >
              {collapsed ? <ExpandMoreIcon sx={{ fontSize: '18px' }} /> : <ExpandLessIcon sx={{ fontSize: '18px' }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Collapse in={!collapsed}>
        <Divider sx={{ backgroundColor: uiColors.borderLight, my: 0.5 }} />
        
        <Box display="flex" gap={0.5} flexWrap="wrap">
          <StyledChip 
            label={`노드 ${nodeCount}`} 
            size="small" 
            sx={{ 
              height: '22px',
              fontSize: '11px',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <StyledChip 
            label={`엣지 ${edgeCount}`} 
            size="small"
            sx={{ 
              height: '22px',
              fontSize: '11px',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <StyledChip 
            label={`리프 ${leafNodesCount}`} 
            size="small" 
            sx={{ 
              height: '22px',
              fontSize: '11px',
              '& .MuiChip-label': { px: 1 },
              backgroundColor: leafNodesCount > 0 ? '#f59e0b20' : undefined,
              color: leafNodesCount > 0 ? '#f59e0b' : undefined,
              borderColor: leafNodesCount > 0 ? '#f59e0b' : undefined,
            }}
          />
        </Box>
      </Collapse>
    </StyledPanel>
    
    {/* 세션 이름 편집 다이얼로그 */}
    <Dialog 
      open={editDialogOpen} 
      onClose={() => setEditDialogOpen(false)}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          minWidth: '360px',
        }
      }}
    >
      <DialogTitle sx={{ fontSize: '16px', fontWeight: 600 }}>세션 이름 편집</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          value={editSessionName}
          onChange={(e) => setEditSessionName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEditSession()
            if (e.key === 'Escape') setEditDialogOpen(false)
          }}
          placeholder="세션 이름 입력"
          size="small"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setEditDialogOpen(false)} size="small">취소</Button>
        <Button onClick={handleEditSession} variant="contained" size="small">
          저장
        </Button>
      </DialogActions>
    </Dialog>
    
    {/* 세션 삭제 확인 다이얼로그 */}
    <Dialog 
      open={deleteDialogOpen} 
      onClose={() => setDeleteDialogOpen(false)}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          minWidth: '320px',
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
        <Button onClick={() => setDeleteDialogOpen(false)} size="small">취소</Button>
        <Button onClick={handleDeleteSession} color="error" variant="contained" size="small">
          삭제
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
})

GraphToolbar.displayName = 'GraphToolbar'

export default GraphToolbar