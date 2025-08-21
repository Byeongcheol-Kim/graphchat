import React from 'react'
import { MenuItem, Box, Typography } from '@mui/material'
import { ColorTheme } from '@shared/theme/colors'

interface ThemeOptionProps {
  value: ColorTheme
  label: string
  colors: string[]
}

export const ThemeOption: React.FC<ThemeOptionProps> = ({ value, label, colors }) => {
  return (
    <MenuItem value={value}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {colors.slice(0, 6).map((color, i) => (
            <Box key={i} sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
          ))}
        </Box>
        <Typography variant="body2">{label}</Typography>
      </Box>
    </MenuItem>
  )
}