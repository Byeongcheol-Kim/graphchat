import React from 'react'
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material'
import MergeTypeIcon from '@mui/icons-material/MergeType'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import SummarizeIcon from '@mui/icons-material/Summarize'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AddCircleIcon from '@mui/icons-material/AddCircle'

interface ContextMenuProps {
  position: { x: number; y: number } | null
  onClose: () => void
  selectedNodes: string[]
  onCreateSummary: () => void
  onCreateReference: () => void
  onDelete: () => void
  onOpenSummaryDialog?: () => void
  onCreateIndependentNode?: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  selectedNodes,
  onCreateSummary,
  onCreateReference,
  onDelete,
  onOpenSummaryDialog,
  onCreateIndependentNode,
}) => {
  const isMultiSelect = selectedNodes.length > 1
  const canCreateNodes = selectedNodes.length > 0
  const isEmpty = selectedNodes.length === 0

  return (
    <Menu
      open={position !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        position !== null
          ? { top: position.y, left: position.x }
          : undefined
      }
      PaperProps={{
        sx: {
          borderRadius: '12px',
          minWidth: 200,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        },
      }}
    >
      {isMultiSelect && (
        <>
          <MenuItem onClick={onOpenSummaryDialog || onCreateSummary}>
            <ListItemIcon>
              <AutoAwesomeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="요약 노드 생성" 
              secondary={onOpenSummaryDialog ? "자동/지침 기반" : `${selectedNodes.length}개 노드 요약`}
            />
          </MenuItem>
          <MenuItem onClick={onCreateReference}>
            <ListItemIcon>
              <MergeTypeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="참조 노드 생성" 
              secondary={`${selectedNodes.length}개 노드 참조`}
            />
          </MenuItem>
          <Divider />
        </>
      )}
      
      {!isMultiSelect && canCreateNodes && (
        <>
          <MenuItem onClick={onCreateReference}>
            <ListItemIcon>
              <AccountTreeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="새 브랜치 생성" />
          </MenuItem>
          <Divider />
        </>
      )}
      
      {isEmpty && onCreateIndependentNode && (
        <MenuItem onClick={onCreateIndependentNode}>
          <ListItemIcon>
            <AddCircleIcon fontSize="small" sx={{ color: 'primary.main' }} />
          </ListItemIcon>
          <ListItemText 
            primary="새 시작 노드" 
            secondary="독립적인 대화 시작"
          />
        </MenuItem>
      )}
      
      {canCreateNodes && (
        <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary="삭제" />
        </MenuItem>
      )}
    </Menu>
  )
}

export default ContextMenu