import React from 'react'
import { Box, Typography, Divider } from '@mui/material'

interface SettingSectionProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
  showDivider?: boolean
}

export const SettingSection: React.FC<SettingSectionProps> = ({ 
  icon, 
  title, 
  subtitle, 
  children, 
  showDivider = true 
}) => {
  return (
    <>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: subtitle ? 1.5 : 0 }}>
          {icon}
          <Typography variant="body2">{title}</Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {children}
      </Box>
      {showDivider && <Divider sx={{ my: 0.5 }} />}
    </>
  )
}