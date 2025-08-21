import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import mermaid from 'mermaid'
import { Box, IconButton, Tooltip, Paper, Snackbar, Alert, Button } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import CheckIcon from '@mui/icons-material/Check'
import { useConversationStore } from '@store/conversationStore'

interface MessageContentProps {
  content: string
  role: 'user' | 'assistant'
  messageId?: string
}

// Mermaid 초기화
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#fff',
    primaryBorderColor: '#7c3aed',
    lineColor: '#5b21b6',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#ddd6fe',
  },
})

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
          const { svg } = await mermaid.render(id, chart)
          setSvg(svg)
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          setSvg('<div>다이어그램 렌더링 실패</div>')
        }
      }
    }
    renderDiagram()
  }, [chart])

  const handleDownload = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagram-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ position: 'relative', my: 2 }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <Tooltip title="다이어그램 다운로드">
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          backgroundColor: 'background.default',
          overflow: 'auto',
          '& svg': { maxWidth: '100%', height: 'auto' },
        }}
      >
        <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} />
      </Paper>
    </Box>
  )
}

const CodeBlock: React.FC<{
  language?: string
  value: string
  inline?: boolean
}> = ({ language, value, inline }) => {
  const [copied, setCopied] = useState(false)
  const { settings } = useConversationStore()
  const isDark = settings.darkMode

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const extension = language || 'txt'
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code-${Date.now()}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Mermaid 다이어그램 처리
  if (language === 'mermaid') {
    return <MermaidDiagram chart={value} />
  }

  // 인라인 코드
  if (inline) {
    return (
      <Box
        component="code"
        sx={{
          px: 0.5,
          py: 0.15,
          backgroundColor: 'action.hover',
          borderRadius: 0.5,
          fontFamily: 'monospace',
          fontSize: '0.85em',
        }}
      >
        {value}
      </Box>
    )
  }

  // 코드 블록
  return (
    <Box sx={{ position: 'relative', my: 1 }}>
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          gap: 0.5,
        }}
      >
        <Tooltip title={copied ? '복사됨!' : '코드 복사'}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="파일로 다운로드">
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 1 }}>
        <SyntaxHighlighter
          language={language || 'text'}
          style={isDark ? vscDarkPlus : vs}
          customStyle={{
            margin: 0,
            padding: '8px',
            fontSize: '10px',
            lineHeight: '1.4',
          }}
          showLineNumbers={value.split('\n').length > 5}
        >
          {value}
        </SyntaxHighlighter>
      </Paper>
    </Box>
  )
}

const MessageContent: React.FC<MessageContentProps> = ({ content, role, messageId }) => {
  const [showCopied, setShowCopied] = useState(false)

  const handleDownloadMessage = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `message-${messageId || Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(content)
    setShowCopied(true)
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* 메시지 액션 버튼 */}
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          right: 0,
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'flex',
          gap: 0.5,
          '.message-container:hover &': {
            opacity: 1,
          },
        }}
      >
        <Tooltip title="메시지 복사">
          <IconButton
            size="small"
            onClick={handleCopyMessage}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="메시지 다운로드">
          <IconButton
            size="small"
            onClick={handleDownloadMessage}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <DownloadIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 마크다운 렌더링 */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : undefined
            const value = String(children).replace(/\n$/, '')
            
            // 인라인 코드는 <code> 태그로, 블록 코드는 다른 처리
            if (inline) {
              return (
                <Box
                  component="code"
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                    fontFamily: 'monospace'
                  }}
                >
                  {children}
                </Box>
              )
            }
            
            return (
              <CodeBlock
                language={language}
                value={value}
                inline={false}
              />
            )
          },
          p({ children }) {
            // children이 문자열만 있는지 확인
            const hasComplexChildren = React.Children.toArray(children).some(
              child => React.isValidElement(child) && 
              (child.type === CodeBlock || 
               (child.props && child.props.inline === false))
            )
            
            // 복잡한 자식이 있으면 div로 렌더링
            if (hasComplexChildren) {
              return (
                <Box component="div" sx={{ my: 0.5, lineHeight: 1.4, fontSize: '11px' }}>
                  {children}
                </Box>
              )
            }
            
            return (
              <Box component="p" sx={{ my: 0.5, lineHeight: 1.4, fontSize: '11px' }}>
                {children}
              </Box>
            )
          },
          ul({ children }) {
            return (
              <Box component="ul" sx={{ my: 0.5, pl: 2.5, fontSize: '11px' }}>
                {children}
              </Box>
            )
          },
          ol({ children }) {
            return (
              <Box component="ol" sx={{ my: 0.5, pl: 2.5, fontSize: '11px' }}>
                {children}
              </Box>
            )
          },
          li({ children }) {
            return (
              <Box component="li" sx={{ my: 0.25, fontSize: '11px' }}>
                {children}
              </Box>
            )
          },
          blockquote({ children }) {
            return (
              <Box
                component="blockquote"
                sx={{
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  pl: 1.5,
                  my: 0.5,
                  fontSize: '11px',
                  color: 'text.secondary',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </Box>
            )
          },
          h1({ children }) {
            return (
              <Box component="h1" sx={{ fontSize: '1.1rem', fontWeight: 600, mt: 1, mb: 0.5 }}>
                {children}
              </Box>
            )
          },
          h2({ children }) {
            return (
              <Box component="h2" sx={{ fontSize: '1rem', fontWeight: 600, mt: 0.75, mb: 0.4 }}>
                {children}
              </Box>
            )
          },
          h3({ children }) {
            return (
              <Box component="h3" sx={{ fontSize: '0.9rem', fontWeight: 600, mt: 0.5, mb: 0.3 }}>
                {children}
              </Box>
            )
          },
          table({ children }) {
            return (
              <Box sx={{ overflowX: 'auto', my: 1 }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': {
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 1,
                    },
                    '& th': {
                      backgroundColor: 'action.hover',
                      fontWeight: 600,
                    },
                  }}
                >
                  {children}
                </Box>
              </Box>
            )
          },
          hr() {
            return <Box component="hr" sx={{ my: 2, border: 'none', borderTop: '1px solid', borderColor: 'divider' }} />
          },
          a({ href, children }) {
            return (
              <Box
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {children}
              </Box>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* 복사 완료 알림 */}
      <Snackbar
        open={showCopied}
        autoHideDuration={2000}
        onClose={() => setShowCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          메시지가 클립보드에 복사되었습니다!
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default MessageContent