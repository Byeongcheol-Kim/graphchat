import React, { useState } from 'react'
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react'
import { Box, TextField, Typography, IconButton } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { borderRadius, fontSize, uiColors } from '@shared/theme'

interface LabeledEdgeData {
  label?: string
  onLabelChange?: (edgeId: string, label: string) => void
}

const LabeledEdge: React.FC<EdgeProps<LabeledEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempLabel, setTempLabel] = useState(data?.label || '')

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const handleSave = () => {
    if (data?.onLabelChange) {
      data.onLabelChange(id, tempLabel)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempLabel(data?.label || '')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <Box
          sx={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            backgroundColor: 'white',
            borderRadius: borderRadius.sm,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid',
            borderColor: '#e5e7eb',
            padding: '2px 6px',
            minWidth: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
          className="nodrag nopan"
        >
          {isEditing ? (
            <>
              <TextField
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoFocus
                variant="standard"
                placeholder="관계 설명..."
                sx={{
                  '& .MuiInput-root': {
                    fontSize: fontSize.xs,
                    '&:before': { display: 'none' },
                    '&:after': { display: 'none' },
                  },
                  '& input': {
                    padding: '2px',
                    minWidth: '80px',
                  },
                }}
              />
              <IconButton size="small" onClick={handleSave} sx={{ padding: '2px' }}>
                <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} />
              </IconButton>
              <IconButton size="small" onClick={handleCancel} sx={{ padding: '2px' }}>
                <CloseIcon sx={{ fontSize: 14, color: '#ef4444' }} />
              </IconButton>
            </>
          ) : (
            <>
              {data?.label ? (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: fontSize.xs,
                    color: uiColors.textSecondary,
                    fontStyle: 'italic',
                  }}
                >
                  {data.label}
                </Typography>
              ) : (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: fontSize.xs,
                    color: uiColors.textMuted,
                    fontStyle: 'italic',
                  }}
                >
                  클릭하여 라벨 추가
                </Typography>
              )}
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
                sx={{ padding: '2px' }}
              >
                <EditIcon sx={{ fontSize: 14, color: uiColors.textMuted }} />
              </IconButton>
            </>
          )}
        </Box>
      </EdgeLabelRenderer>
    </>
  )
}

export default LabeledEdge