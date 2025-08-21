import React, { useState } from 'react'
import {
  IconButton,
  Menu,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  Tooltip,
  Select,
  FormControl,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import FormatSizeIcon from '@mui/icons-material/FormatSize'
import PaletteIcon from '@mui/icons-material/Palette'
import { borderRadius, uiColors } from '@shared/theme'
import { ColorTheme } from '@shared/theme/colors'
import { useConversationStore } from '@store/conversationStore'
import { SettingSection } from './settings/SettingSection'
import { ThemeOption } from './settings/ThemeOption'
import { themeConfigs } from './settings/themeConfig'

const FONT_SIZE_MAP = {
  small: '12px',
  medium: '14px',
  large: '16px',
} as const

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
        <SettingSection
          icon={settings.darkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          title="다크 모드"
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -3 }}>
            <Switch
              checked={settings.darkMode}
              onChange={handleDarkModeToggle}
              size="small"
            />
          </Box>
        </SettingSection>
        
        {/* 글자 크기 설정 */}
        <SettingSection
          icon={<FormatSizeIcon fontSize="small" />}
          title="글자 크기"
          subtitle={FONT_SIZE_MAP[settings.fontSize]}
        >
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
        </SettingSection>
        
        {/* 색상 테마 설정 */}
        <SettingSection
          icon={<PaletteIcon fontSize="small" />}
          title="색상 테마"
        >
          <FormControl fullWidth size="small">
            <Select
              value={settings.colorTheme}
              onChange={(e) => updateSettings({ colorTheme: e.target.value as ColorTheme })}
              sx={{
                borderRadius: borderRadius.sm,
                fontSize: '0.875rem',
                '& .MuiSelect-select': {
                  py: 0.75,
                },
              }}
            >
              {themeConfigs.map((theme) => (
                <ThemeOption
                  key={theme.value}
                  value={theme.value}
                  label={theme.label}
                  colors={theme.colors}
                />
              ))}
            </Select>
          </FormControl>
        </SettingSection>
        
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