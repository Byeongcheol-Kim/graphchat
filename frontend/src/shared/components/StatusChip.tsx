import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { chipStyles } from '@shared/theme/styles'

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: 'active' | 'paused' | 'completed'
}

const StatusChip: React.FC<StatusChipProps> = ({ 
  status,
  sx,
  ...props 
}) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'active':
        return {
          borderColor: '#4caf50',
          color: '#2e7d32',
        }
      case 'paused':
        return {
          borderColor: '#ff9800',
          color: '#e65100',
        }
      case 'completed':
        return {
          borderColor: '#6366f1',
          color: '#4338ca',
        }
      default:
        return {
          borderColor: '#9e9e9e',
          color: '#424242',
        }
    }
  }
  
  return (
    <Chip
      variant="outlined"
      {...props}
      sx={{
        ...chipStyles,
        ...getStatusStyle(),
        ...sx,
      }}
    />
  )
}

export default StatusChip