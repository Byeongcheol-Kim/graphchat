import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { getNodeTypeColor } from '@shared/theme/colors'
import { chipStyles } from '@shared/theme/styles'

interface NodeTypeChipProps extends Omit<ChipProps, 'color'> {
  nodeType?: string
  variant?: 'filled' | 'outlined'
}

const NodeTypeChip: React.FC<NodeTypeChipProps> = ({ 
  nodeType,
  variant = 'filled',
  sx,
  ...props 
}) => {
  const color = getNodeTypeColor(nodeType)
  
  const filledStyles = {
    backgroundColor: `${color}25`,
    color: color,
    fontWeight: 600,
    border: `1px solid ${color}40`,
  }
  
  const outlinedStyles = {
    borderColor: color,
    color: color,
  }
  
  return (
    <Chip
      {...props}
      sx={{
        ...chipStyles,
        ...(variant === 'filled' ? filledStyles : outlinedStyles),
        ...sx,
      }}
    />
  )
}

export default NodeTypeChip