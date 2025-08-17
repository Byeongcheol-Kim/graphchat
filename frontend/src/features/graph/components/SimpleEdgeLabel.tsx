import React, { useState } from 'react'
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react'
import { Box, Typography, Popover, TextField, IconButton, Divider } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import { borderRadius, fontSize, uiColors } from '@shared/theme'

interface EdgeMetadata {
  createdAt?: Date
  messageCount?: number
  reason?: string
}

interface SimpleEdgeLabelData {
  label?: string
  metadata?: EdgeMetadata
  onLabelChange?: (edgeId: string, label: string) => void
}

const SimpleEdgeLabel: React.FC<EdgeProps<SimpleEdgeLabelData>> = ({
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!isEditing) {
      setAnchorEl(event.currentTarget)
    }
  }

  const handleClose = () => {
    setAnchorEl(null)
    setIsEditing(false)
    setTempLabel(data?.label || '')
  }

  const handleSave = () => {
    if (data?.onLabelChange) {
      data.onLabelChange(id, tempLabel)
    }
    setIsEditing(false)
  }

  const formatDate = (date?: Date) => {
    if (!date) return '알 수 없음'
    const d = new Date(date)
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <Box
            sx={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              cursor: 'pointer',
            }}
            className="nodrag nopan"
            onClick={handleClick}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: fontSize.xs,
                color: uiColors.textMuted,
                fontStyle: 'italic',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '2px 6px',
                borderRadius: borderRadius.xs,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: uiColors.textSecondary,
                },
              }}
            >
              {data.label}
            </Typography>
          </Box>
          
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            PaperProps={{
              sx: {
                borderRadius: borderRadius.md,
                minWidth: 250,
                maxWidth: 350,
              }
            }}
          >
            <Box sx={{ p: 2 }}>
              {/* 관계 라벨 편집 */}
              {isEditing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TextField
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    size="small"
                    autoFocus
                    fullWidth
                    placeholder="관계 설명..."
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: fontSize.sm,
                      },
                    }}
                  />
                  <IconButton size="small" onClick={handleSave} color="success">
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setIsEditing(false)} color="error">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingFlatIcon sx={{ fontSize: 18, color: uiColors.textMuted }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {data.label || '관계'}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setIsEditing(true)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              
              <Divider sx={{ mb: 2 }} />
              
              {/* 메타데이터 표시 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 16, color: uiColors.textMuted }} />
                  <Typography variant="caption" sx={{ color: uiColors.textSecondary }}>
                    연결 시간: {formatDate(data.metadata?.createdAt)}
                  </Typography>
                </Box>
                
                {data.metadata?.messageCount !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: uiColors.textSecondary }}>
                      관련 메시지: {data.metadata.messageCount}개
                    </Typography>
                  </Box>
                )}
                
                {data.metadata?.reason && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: uiColors.textMuted, display: 'block', mb: 0.5 }}>
                      연결 이유:
                    </Typography>
                    <Typography variant="caption" sx={{ color: uiColors.textSecondary, fontStyle: 'italic' }}>
                      "{data.metadata.reason}"
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Popover>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default SimpleEdgeLabel