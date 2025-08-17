import React, { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  Tooltip,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import FormatSizeIcon from '@mui/icons-material/FormatSize'
import { borderRadius, uiColors } from '@shared/theme'
import { useConversationStore } from '@store/conversationStore'

const SettingsMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { settings, updateSettings } = useConversationStore()
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }
  
  const handleFontSizeChange = (
    event: React.MouseEvent<HTMLElement>,
    newSize: 'small' | 'medium' | 'large' | null,
  ) => {
    if (newSize !== null) {
      updateSettings({ fontSize: newSize })
    }
  }
  
  const handleDarkModeToggle = () => {
    updateSettings({ darkMode: !settings.darkMode })
  }
  
  const getFontSizeValue = () => {
    switch (settings.fontSize) {
      case 'small': return '12px'
      case 'medium': return '14px'
      case 'large': return '16px'
      default: return '14px'
    }
  }
  
  return (
    <>
      <Tooltip title="설정">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ p: 0.5 }}
        >
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            borderRadius: borderRadius.lg,
            minWidth: 280,
            p: 1,
          }
        }}
      >
        {/* 다크 모드 토글 */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {settings.darkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              <Typography variant="body2">
                다크 모드
              </Typography>
            </Box>
            <Switch
              checked={settings.darkMode}
              onChange={handleDarkModeToggle}
              size="small"
            />
          </Box>
        </Box>
        
        <Divider sx={{ my: 0.5 }} />
        
        {/* 글자 크기 설정 */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <FormatSizeIcon fontSize="small" />
            <Typography variant="body2">
              글자 크기
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: uiColors.textMuted }}>
              {getFontSizeValue()}
            </Typography>
          </Box>
          
          <ToggleButtonGroup
            value={settings.fontSize}
            exclusive
            onChange={handleFontSizeChange}
            size="small"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                py: 0.5,
                borderRadius: borderRadius.sm,
                textTransform: 'none',
              }
            }}
          >
            <ToggleButton value="small">
              <Typography variant="caption">작게</Typography>
            </ToggleButton>
            <ToggleButton value="medium">
              <Typography variant="body2">보통</Typography>
            </ToggleButton>
            <ToggleButton value="large">
              <Typography variant="subtitle2">크게</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Divider sx={{ my: 0.5 }} />
        
        {/* 추가 설정 정보 */}
        <Box sx={{ px: 2, py: 1, opacity: 0.7 }}>
          <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
            설정은 현재 세션에만 적용됩니다
          </Typography>
        </Box>
      </Menu>
    </>
  )
}

export default SettingsMenu