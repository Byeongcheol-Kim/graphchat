import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import WarningIcon from '@mui/icons-material/Warning'
import { borderRadius, uiColors } from '@shared/theme'
import { Node } from '@/types'

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (includeDescendants: boolean) => void
  selectedNodes: string[]
  branches: Node[]
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  selectedNodes,
  branches,
}) => {
  const [includeDescendants, setIncludeDescendants] = useState(true)
  
  // 선택된 노드들과 그 자손들 찾기
  const getDescendants = (nodeId: string): Set<string> => {
    const descendants = new Set<string>()
    const queue = [nodeId]
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      descendants.add(currentId)
      
      // 현재 노드의 자식들 찾기
      const children = branches.filter(b => 
        b.parentId === currentId || 
        (b as any).parentIds?.includes(currentId) ||
        (b as any).sourceNodeIds?.includes(currentId)
      )
      
      children.forEach(child => {
        if (!descendants.has(child.id)) {
          queue.push(child.id)
        }
      })
    }
    
    return descendants
  }
  
  // 선택된 노드들과 모든 자손들
  const allNodesToDelete = new Set<string>()
  const hasChildrenNodes: string[] = []
  
  selectedNodes.forEach(nodeId => {
    const descendants = getDescendants(nodeId)
    descendants.forEach(id => allNodesToDelete.add(id))
    
    // 자식이 있는 노드 확인
    const hasChildren = branches.some(b => 
      b.parentId === nodeId || b.parentIds?.includes(nodeId)
    )
    if (hasChildren) {
      hasChildrenNodes.push(nodeId)
    }
  })
  
  const selectedBranches = selectedNodes.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[]
  const descendantCount = allNodesToDelete.size - selectedNodes.length
  
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
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1,
      }}>
        <DeleteForeverIcon color="error" />
        <Typography variant="h6">노드 삭제 확인</Typography>
      </DialogTitle>
      
      <DialogContent>
        {hasChildrenNodes.length > 0 && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 2 }}
          >
            선택한 노드에 하위 노드가 있습니다. 삭제하면 모든 하위 노드도 함께 삭제됩니다.
          </Alert>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            삭제할 노드 ({selectedNodes.length}개):
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {selectedBranches.map(branch => (
              <Chip
                key={branch.id}
                label={branch.title}
                size="small"
                color="error"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
        
        {descendantCount > 0 && (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeDescendants}
                  onChange={(e) => setIncludeDescendants(e.target.checked)}
                />
              }
              label="하위 노드 포함 삭제"
              sx={{ mt: 2, mb: 1 }}
            />
            
            {includeDescendants && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'error.50',
                borderRadius: borderRadius.md,
                border: '1px solid',
                borderColor: 'error.200',
              }}>
                <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                  ⚠️ 함께 삭제될 하위 노드: {descendantCount}개
                </Typography>
                <Typography variant="caption" sx={{ color: 'error.dark', display: 'block', mt: 0.5 }}>
                  총 {allNodesToDelete.size}개의 노드가 삭제됩니다
                </Typography>
              </Box>
            )}
          </>
        )}
        
        <Typography variant="body2" sx={{ mt: 2, color: uiColors.textSecondary }}>
          이 작업은 되돌릴 수 있습니다 (Ctrl+Z).
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: borderRadius.md }}
        >
          취소
        </Button>
        <Button 
          onClick={() => {
            onConfirm(includeDescendants)
            onClose()
          }}
          variant="contained"
          color="error"
          startIcon={<DeleteForeverIcon />}
          sx={{ borderRadius: borderRadius.md }}
        >
          {descendantCount > 0 && includeDescendants ? '모두 삭제' : '삭제'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmDialog