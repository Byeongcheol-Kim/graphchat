import React, { useState } from 'react'
import {
  ListItem,
  Box,
  Typography,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import CheckIcon from '@mui/icons-material/Check'
import { Message } from '@/types'
import MessageContent from './MessageContent'
import { borderRadius, messageStyles } from '@shared/theme'

interface MessageItemProps {
  message: Message
  headerColor: string
  isStreaming?: boolean
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  headerColor,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `message_${message.id}_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  return (
    <Fade in={true} timeout={500}>
      <ListItem
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          py: 0.5,
          px: 0,
        }}
      >
        <Box
          sx={{
            width: '100%',
            borderRadius: borderRadius.lg,
            border: '1px solid',
            borderColor: isUser ? `${headerColor}30` : 'divider',
            backgroundColor: isUser ? `${headerColor}08` : 'background.paper',
            overflow: 'hidden',
            ...messageStyles.container,
          }}
        >
            {/* 타임스탬프 헤더 (AI 메시지) */}
            {!isUser && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title={copied ? "복사됨!" : "복사"}>
                    <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
                      {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="다운로드">
                    <IconButton size="small" onClick={handleDownload} sx={{ p: 0.25 }}>
                      <DownloadIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
            
            {/* 메시지 내용 */}
            <Box sx={{ p: 1 }}>
              {message.content.startsWith('━━━') ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.secondary',
                    my: 0.5,
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                >
                  {message.content}
                </Typography>
              ) : message.content.startsWith('[브랜치:') ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: headerColor,
                    mb: 0.5,
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                >
                  {message.content}
                </Typography>
              ) : (
                <>
                  <MessageContent content={message.content} role={message.role} />
                  {/* 스트리밍 중 커서 애니메이션 */}
                  {isStreaming && (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        width: '8px',
                        height: '16px',
                        backgroundColor: headerColor,
                        marginLeft: '2px',
                        animation: 'blink 1s infinite',
                        '@keyframes blink': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0 },
                          '100%': { opacity: 1 },
                        },
                      }}
                    />
                  )}
                </>
              )}
            </Box>
            
            {/* 사용자 메시지 타임스탬프 및 액션 */}
            {isUser && (
              <Box
                sx={{
                  px: 1.5,
                  pb: 0.3,
                  pt: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title={copied ? "복사됨!" : "복사"}>
                    <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
                      {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="다운로드">
                    <IconButton size="small" onClick={handleDownload} sx={{ p: 0.25 }}>
                      <DownloadIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                  {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            )}
          </Box>
      </ListItem>
    </Fade>
  )
}