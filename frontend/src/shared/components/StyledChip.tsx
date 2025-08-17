import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { chipStyles } from '@shared/theme/styles'

interface StyledChipProps extends ChipProps {
  nodeType?: string
  customColor?: string
}

const StyledChip: React.FC<StyledChipProps> = ({ 
  nodeType, 
  customColor,
  sx,
  ...props 
}) => {
  return (
    <Chip
      {...props}
      sx={{
        ...chipStyles,
        ...sx,
      }}
    />
  )
}

export default StyledChip