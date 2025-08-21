import React, { useState, useMemo, useEffect } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, IconButton, Tooltip, CircularProgress } from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import { uiColors } from '@shared/theme'
import { useConversationStore } from '@store/conversationStore'
import { useSessionStore } from '@store/sessionStore'

import GraphCanvas from '@features/graph/components/GraphCanvas'
import ConversationPanel from '@features/conversation/components/ConversationPanel'


function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(480)
  const [isResizing, setIsResizing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const { settings } = useConversationStore()
  const { currentSession, createSession, loadSession, isLoading } = useSessionStore()
  
  const theme = useMemo(() => createTheme({
    palette: {
      mode: settings.darkMode ? 'dark' : 'light',
      primary: {
        main: '#6366f1',
      },
      secondary: {
        main: '#8b5cf6',
      },
      background: settings.darkMode ? {
        default: '#121212',
        paper: '#1e1e1e',
      } : {
        default: '#fafafa',
        paper: '#ffffff',
      },
    },
    typography: {
      fontSize: settings.fontSize === 'small' ? 12 : settings.fontSize === 'large' ? 16 : 14,
      body1: {
        fontSize: settings.fontSize === 'small' ? '0.875rem' : settings.fontSize === 'large' ? '1.125rem' : '1rem',
      },
      body2: {
        fontSize: settings.fontSize === 'small' ? '0.75rem' : settings.fontSize === 'large' ? '1rem' : '0.875rem',
      },
      caption: {
        fontSize: settings.fontSize === 'small' ? '0.625rem' : settings.fontSize === 'large' ? '0.875rem' : '0.75rem',
      },
    },
  }), [settings.darkMode, settings.fontSize])

  const handleMouseDown = () => {
    setIsResizing(true)
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    const newWidth = window.innerWidth - e.clientX
    // 최소 300px, 최대 화면의 80%까지 확장 가능
    const maxWidth = Math.min(1200, window.innerWidth * 0.8)
    if (newWidth >= 300 && newWidth <= maxWidth) {
      setPanelWidth(newWidth)
    }
  }

  // 초기 세션 생성 또는 로드
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // localStorage에서 마지막 세션 ID 확인
        const lastSessionId = localStorage.getItem('lastSessionId')
        
        if (lastSessionId && !currentSession) {
          // 기존 세션 로드 시도
          try {
            await loadSession(lastSessionId)
            console.log('기존 세션 로드:', lastSessionId)
          } catch (error) {
            console.error('기존 세션 로드 실패:', error)
            // 로드 실패 시 새 세션 생성
            await createSession('새로운 대화 세션', '자동 생성된 세션')
          }
        } else if (!currentSession) {
          // 세션이 없으면 새로 생성
          await createSession('새로운 대화 세션', '자동 생성된 세션')
        }
      } catch (error) {
        console.error('세션 초기화 실패:', error)
      } finally {
        setIsInitializing(false)
      }
    }
    
    initializeSession()
  }, [])
  
  // WebSocket 이벤트는 sessionStore에서 처리하므로 여기서는 제거
  
  // 세션이 변경되면 노드가 이미 sessionStore에서 로드되므로 여기서는 제거
  // 노드 로딩은 sessionStore의 loadSession과 createSession에서 처리됨

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  // 초기화 중일 때 로딩 표시
  if (isInitializing || isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: theme.palette.background.default,
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* 그래프 영역 */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
          }}
        >
          <GraphCanvas />
          
          {/* 채팅 패널 토글 버튼 */}
          {!isPanelOpen && (
            <Tooltip title="채팅 패널 열기" placement="left">
              <IconButton
                onClick={() => setIsPanelOpen(true)}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  backgroundColor: uiColors.backgroundSecondary,
                  color: uiColors.textSecondary,
                  '&:hover': {
                    backgroundColor: '#e9ecef',
                  },
                  boxShadow: 2,
                  zIndex: 1000,
                }}
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {/* 대화 패널 */}
        <Box
          sx={{
            width: isPanelOpen ? panelWidth : 0,
            transition: isResizing ? 'none' : 'width 0.3s ease',
            borderLeft: isPanelOpen ? '1px solid #e5e7eb' : 'none',
            overflow: 'hidden',
            position: 'relative',
            userSelect: isResizing ? 'none' : 'auto',
          }}
        >
          {isPanelOpen && (
            <>
              {/* 리사이즈 핸들 */}
              <Box
                onMouseDown={handleMouseDown}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  cursor: 'col-resize',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: '#6366f1',
                  },
                  zIndex: 1002,
                }}
              />
              {/* 닫기 버튼 */}
              <Tooltip title="채팅 패널 닫기" placement="left">
                <IconButton
                  onClick={() => setIsPanelOpen(false)}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    zIndex: 1001,
                    color: '#424242',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.04)',
                    },
                  }}
                  size="small"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <ConversationPanel />
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App