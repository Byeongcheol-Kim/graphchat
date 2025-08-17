import React from 'react'
import { Paper, PaperProps } from '@mui/material'
import { panelStyles } from '@shared/theme/styles'

const StyledPanel: React.FC<PaperProps> = ({ sx, children, ...props }) => {
  return (
    <Paper
      elevation={3}
      {...props}
      sx={{
        ...panelStyles,
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}

export default StyledPanel