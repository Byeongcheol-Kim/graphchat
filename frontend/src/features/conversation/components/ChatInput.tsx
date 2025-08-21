import React, { useRef, useState } from 'react'
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Avatar,
  // Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import ExtensionIcon from '@mui/icons-material/Extension'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AddIcon from '@mui/icons-material/Add'
import DownloadIcon from '@mui/icons-material/Download'
// import { borderRadius } from '@shared/theme'

interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
}

interface ChatInputProps {
  input: string
  attachments: FileAttachment[]
  headerColor: string
  disabled?: boolean  // 비활성화 상태 추가
  onInputChange: (value: string) => void
  onSend: () => void
  onAttachFile: (files: FileList) => void
  onRemoveAttachment: (id: string) => void
  onOpenVectorSearch?: () => void
  onOpenSummary?: () => void
  // onOpenKnowledgeGraph?: () => void
  onDownload?: () => void
}

const ChatInputComponent: React.FC<ChatInputProps> = ({
  input,
  attachments,
  headerColor,
  disabled = false,  // 기본값 false
  onInputChange,
  onSend,
  onAttachFile,
  onRemoveAttachment,
  onOpenVectorSearch,
  onOpenSummary,
  // onOpenKnowledgeGraph,
  onDownload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null)
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onAttachFile(files)
    }
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor(event.currentTarget)
  }
  
  const handleActionClose = () => {
    setActionMenuAnchor(null)
  }
  
  const handleVectorSearch = () => {
    onOpenVectorSearch?.()
    handleActionClose()
  }
  
  const handleSummary = () => {
    onOpenSummary?.()
    handleActionClose()
  }
  
  return (
    <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      {/* 첨부 파일 목록 */}
      {attachments.length > 0 && (
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {attachments.map(file => (
            <Chip
              key={file.id}
              avatar={
                <Avatar sx={{ bgcolor: 'transparent' }}>
                  {file.type.startsWith('image/') ? <ImageIcon sx={{ fontSize: 18 }} /> : <InsertDriveFileIcon sx={{ fontSize: 18 }} />}
                </Avatar>
              }
              label={`${file.name} (${formatFileSize(file.size)})`}
              onDelete={() => onRemoveAttachment(file.id)}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '4px',
                height: 26,
                '& .MuiChip-deleteIcon': {
                  fontSize: 18,
                },
              }}
            />
          ))}
        </Box>
      )}
      
      {/* 입력 필드 */}
      <TextField
        fullWidth
        multiline
        maxRows={3}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? "요약을 생성하는 중입니다..." : "메시지를 입력하세요..."}
        disabled={disabled}
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            backgroundColor: 'background.paper',
            fontSize: '12px',
            py: 0.75,
            '& fieldset': {
              borderWidth: '1px',
              borderColor: 'rgba(0,0,0,0.2)',
              transition: 'all 0.15s',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0,0,0,0.3)',
              borderWidth: '1px',
            },
            '&.Mui-focused fieldset': {
              borderColor: headerColor,
              borderWidth: '1.5px',
            },
          },
          '& .MuiInputBase-input': {
            fontSize: '12px',
            lineHeight: 1.4,
            py: 0.75,
            '&::placeholder': {
              color: 'text.secondary',
              opacity: 0.6,
            },
          },
        }}
      />
      
      {/* 버튼들 */}
      <Box sx={{ mt: 0.75, display: 'flex', gap: 0.75, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 0.4 }}>
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            sx={{
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: '4px',
              backgroundColor: 'background.paper',
              p: 0.5,
              transition: 'all 0.15s',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)',
                borderColor: 'rgba(0,0,0,0.3)',
              },
            }}
          >
            <AttachFileIcon sx={{ fontSize: 16 }} />
          </IconButton>
          
          <IconButton
            onClick={handleActionClick}
            disabled={disabled}
            sx={{
              border: `1px solid ${headerColor}50`,
              borderRadius: '4px',
              backgroundColor: `${headerColor}05`,
              color: headerColor,
              p: 0.5,
              transition: 'all 0.15s',
              '&:hover': {
                backgroundColor: `${headerColor}10`,
                borderColor: `${headerColor}70`,
              },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
          
          {onDownload && (
            <IconButton
              onClick={onDownload}
              disabled={disabled}
              sx={{
                border: '1px solid rgba(0,0,0,0.2)',
                borderRadius: '4px',
                backgroundColor: 'background.paper',
                p: 0.5,
                transition: 'all 0.15s',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  borderColor: 'rgba(0,0,0,0.3)',
                },
              }}
            >
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
        
        <IconButton
          onClick={onSend}
          disabled={!input.trim() || disabled}
          sx={{
            backgroundColor: headerColor,
            color: 'white',
            borderRadius: '4px',
            px: 1.25,
            py: 0.5,
            border: '1px solid transparent',
            '&:hover': {
              backgroundColor: headerColor,
              filter: 'brightness(0.95)',
              borderColor: 'rgba(0,0,0,0.1)',
            },
            '&:active': {
              filter: 'brightness(0.9)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(0,0,0,0.12)',
              color: 'rgba(0,0,0,0.26)',
            },
            transition: 'all 0.15s',
          }}
        >
          <SendIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      
      {/* 액션 메뉴 */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
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
            mt: -0.5,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.08)',
            '& .MuiMenuItem-root': {
              fontSize: '11px',
              py: 0.4,
              px: 1,
              minHeight: 'auto',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)',
              },
            },
            '& .MuiListItemIcon-root': {
              minWidth: 24,
            },
          }
        }}
      >
        <MenuItem onClick={handleVectorSearch}>
          <ListItemIcon>
            <ExtensionIcon sx={{ fontSize: 14 }} />
          </ListItemIcon>
          <ListItemText 
            primary="벡터 검색"
            primaryTypographyProps={{
              fontSize: '11px',
              fontWeight: 400,
            }}
          />
        </MenuItem>
        <MenuItem onClick={handleSummary}>
          <ListItemIcon>
            <AutoAwesomeIcon sx={{ fontSize: 14 }} />
          </ListItemIcon>
          <ListItemText 
            primary="요약 생성"
            primaryTypographyProps={{
              fontSize: '11px',
              fontWeight: 400,
            }}
          />
        </MenuItem>
      </Menu>
      
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </Box>
  )
}

export const ChatInput = React.memo(ChatInputComponent)