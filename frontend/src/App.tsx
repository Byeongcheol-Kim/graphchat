import React, { useState, useMemo } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, IconButton, Tooltip } from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import { uiColors } from '@shared/theme'
import { useConversationStore } from '@store/conversationStore'

import GraphCanvas from '@features/graph/components/GraphCanvas'
import ConversationPanel from '@features/conversation/components/ConversationPanel'


function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const { settings } = useConversationStore()
  
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
    if (newWidth >= 300 && newWidth <= 800) {
      setPanelWidth(newWidth)
    }
  }

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