import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { chipStyles } from '@shared/theme/styles'
import { useThemeColor } from '@shared/hooks/useThemeColor'
import { NodeType } from '@/types'

interface NodeTypeChipProps extends Omit<ChipProps, 'color'> {
  type?: NodeType
  nodeType?: string
  variant?: 'filled' | 'outlined'
}

const getNodeTypeLabel = (type?: NodeType | string) => {
  switch (type) {
    case 'root': return '루트'
    case 'main': return '메인'
    case 'topic': return '주제'
    case 'exploration': return '탐구'
    case 'question': return '질문'
    case 'solution': return '해결'
    case 'summary': return '요약'
    case 'reference': return '참조'
    default: return type || '노드'
  }
}

const NodeTypeChip: React.FC<NodeTypeChipProps> = ({ 
  type,
  nodeType,
  variant = 'filled',
  sx,
  label,
  ...props 
}) => {
  const { getNodeTypeColor } = useThemeColor()
  const nodeTypeValue = type || nodeType
  const color = getNodeTypeColor(nodeTypeValue)
  
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
      label={label || getNodeTypeLabel(nodeTypeValue)}
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