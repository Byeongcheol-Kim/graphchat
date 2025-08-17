import React, { useState } from 'react'
import { 
  Box, 
  SpeedDial, 
  SpeedDialAction, 
  SpeedDialIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import LinkIcon from '@mui/icons-material/Link'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import { useConversationStore } from '@store/conversationStore'

const BranchingControls: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newBranchTitle, setNewBranchTitle] = useState('')
  const [newBranchType, setNewBranchType] = useState<'topic' | 'exploration' | 'question' | 'solution'>('topic')
  const [autoBranchEnabled, setAutoBranchEnabled] = useState(false)
  
  const { currentBranchId, createBranch } = useConversationStore()

  const actions = [
    { icon: <AddIcon />, name: '새 브랜치', action: 'new-branch' },
    { icon: <CallSplitIcon />, name: autoBranchEnabled ? '자동 분기 끄기' : '자동 분기 켜기', action: 'auto-branch' },
    { icon: <LinkIcon />, name: '교차 연결', action: 'cross-link' },
    { icon: <ZoomInIcon />, name: '확대', action: 'zoom-in' },
    { icon: <ZoomOutIcon />, name: '축소', action: 'zoom-out' },
    { icon: <CenterFocusStrongIcon />, name: '중앙 정렬', action: 'center' },
  ]

  const handleAction = (action: string) => {
    console.log('액션:', action)
    switch (action) {
      case 'new-branch':
        setDialogOpen(true)
        break
      case 'auto-branch':
        setAutoBranchEnabled(!autoBranchEnabled)
        // 자동 분기 시뮬레이션
        if (!autoBranchEnabled) {
          setTimeout(() => {
            createBranch(currentBranchId, '자동 생성된 브랜치', 'exploration')
          }, 2000)
        }
        break
      case 'cross-link':
        // 교차 연결 모드 활성화
        break
      case 'zoom-in':
        // 그래프 확대
        break
      case 'zoom-out':
        // 그래프 축소
        break
      case 'center':
        // 그래프 중앙 정렬
        break
    }
  }
  
  const handleCreateBranch = () => {
    if (newBranchTitle.trim()) {
      createBranch(currentBranchId, newBranchTitle, newBranchType)
      setDialogOpen(false)
      setNewBranchTitle('')
      setNewBranchType('topic')
    }
  }

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
      >
        <SpeedDial
          ariaLabel="분기 컨트롤"
          icon={<SpeedDialIcon />}
          direction="up"
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => handleAction(action.action)}
            />
          ))}
        </SpeedDial>
      </Box>
      
      {/* 새 브랜치 생성 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoGraphIcon color="primary" />
            <Typography variant="h6">새 브랜치 생성</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="브랜치 제목"
              value={newBranchTitle}
              onChange={(e) => setNewBranchTitle(e.target.value)}
              fullWidth
              autoFocus
              placeholder="예: 기술적 세부사항, 윤리적 고려사항..."
            />
            
            <FormControl fullWidth>
              <InputLabel>브랜치 유형</InputLabel>
              <Select
                value={newBranchType}
                onChange={(e) => setNewBranchType(e.target.value as any)}
                label="브랜치 유형"
              >
                <MenuItem value="topic">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#9C27B0', borderRadius: '50%' }} />
                    주제 브랜치
                  </Box>
                </MenuItem>
                <MenuItem value="exploration">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#4CAF50', borderRadius: '50%' }} />
                    탐색 브랜치
                  </Box>
                </MenuItem>
                <MenuItem value="question">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#FFC107', borderRadius: '50%' }} />
                    질문 브랜치
                  </Box>
                </MenuItem>
                <MenuItem value="solution">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#00BCD4', borderRadius: '50%' }} />
                    해결책 브랜치
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary">
              현재 브랜치 '{currentBranchId}'에서 새로운 브랜치가 생성됩니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleCreateBranch} 
            variant="contained"
            disabled={!newBranchTitle.trim()}
          >
            생성
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 자동 분기 활성화 표시 */}
      {autoBranchEnabled && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            right: 16,
            bgcolor: 'success.main',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <AutoGraphIcon />
          <Typography variant="body2">자동 분기 활성화</Typography>
        </Box>
      )}
    </>
  )
}

export default BranchingControls