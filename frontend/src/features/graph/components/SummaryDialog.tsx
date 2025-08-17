import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Typography,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { borderRadius, uiColors } from '@shared/theme'
import { Branch } from '@store/conversationStore'

interface SummaryDialogProps {
  open: boolean
  onClose: () => void
  selectedNodes: string[]
  branches: Branch[]
  onCreateSummary: (nodeIds: string[], instructions?: string) => void
}

const SummaryDialog: React.FC<SummaryDialogProps> = ({
  open,
  onClose,
  selectedNodes,
  branches,
  onCreateSummary,
}) => {
  const [summaryMode, setSummaryMode] = useState<'auto' | 'manual'>('auto')
  const [instructions, setInstructions] = useState('')
  
  const selectedBranches = selectedNodes
    .map(id => branches.find(b => b.id === id))
    .filter(Boolean) as Branch[]
  
  const handleCreateSummary = () => {
    if (summaryMode === 'manual' && instructions.trim()) {
      onCreateSummary(selectedNodes, instructions)
    } else {
      onCreateSummary(selectedNodes)
    }
    onClose()
    setInstructions('')
    setSummaryMode('auto')
  }
  
  const exampleInstructions = [
    '기술적 구현 방법 중심으로 요약',
    '윤리적 고려사항을 강조하여 정리',
    '주요 의사결정 포인트 위주로 요약',
    '실행 가능한 액션 아이템 추출',
    '핵심 인사이트와 발견사항 정리',
  ]
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: borderRadius.lg,
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">노드 요약 생성</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        {/* 선택된 노드 표시 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: uiColors.textSecondary }}>
            선택된 노드 ({selectedBranches.length}개)
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {selectedBranches.map(branch => (
              <Chip
                key={branch.id}
                label={branch.title}
                size="small"
                sx={{
                  backgroundColor: `${uiColors.textSecondary}20`,
                }}
              />
            ))}
          </Box>
        </Box>
        
        {/* 요약 모드 선택 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: uiColors.textPrimary }}>
            요약 방식
          </Typography>
          <RadioGroup
            value={summaryMode}
            onChange={(e) => setSummaryMode(e.target.value as 'auto' | 'manual')}
          >
            <FormControlLabel
              value="auto"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    자동 요약
                  </Typography>
                  <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
                    AI가 자동으로 핵심 내용을 추출하여 요약합니다
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="manual"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    지침 기반 요약
                  </Typography>
                  <Typography variant="caption" sx={{ color: uiColors.textMuted }}>
                    특정 관점이나 목적에 맞춰 요약합니다
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>
        
        {/* 수동 요약 지침 입력 */}
        {summaryMode === 'manual' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: uiColors.textPrimary }}>
              요약 지침
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="어떤 관점으로 요약할지 지침을 입력하세요..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: borderRadius.md,
                },
              }}
            />
            
            {/* 예시 지침 */}
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ color: uiColors.textMuted, display: 'block', mb: 1 }}>
                예시 지침:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {exampleInstructions.map((example, idx) => (
                  <Chip
                    key={idx}
                    label={example}
                    size="small"
                    onClick={() => setInstructions(example)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: uiColors.backgroundTertiary,
                      '&:hover': {
                        backgroundColor: uiColors.backgroundSecondary,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
        
        {/* 안내 메시지 */}
        <Alert severity="info" sx={{ borderRadius: borderRadius.md }}>
          {summaryMode === 'auto' 
            ? '선택한 노드들의 핵심 포인트와 주요 내용을 자동으로 추출하여 통합 요약을 생성합니다.'
            : '입력한 지침에 따라 선택한 노드들을 특정 관점에서 분석하고 요약합니다.'
          }
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          onClick={handleCreateSummary}
          disabled={summaryMode === 'manual' && !instructions.trim()}
          startIcon={summaryMode === 'auto' ? <AutoAwesomeIcon /> : <EditNoteIcon />}
        >
          {summaryMode === 'auto' ? '자동 요약' : '지침 기반 요약'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SummaryDialog