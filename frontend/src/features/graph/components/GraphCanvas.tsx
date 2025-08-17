import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  Panel,
  ConnectionLineType,
  ReactFlowInstance,
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'
import { Box, Typography, IconButton, Tooltip, TextField, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useConversationStore } from '@store/conversationStore'
import { nodeTypeColors, uiColors } from '@shared/theme'
import { StyledButton, StyledPanel, StyledChip } from '@shared/components'
import EnhancedNode from './EnhancedNode'
import ContextMenu from './ContextMenu'
import SimpleEdgeLabel from './SimpleEdgeLabel'
import SummaryDialog from './SummaryDialog'
import SettingsMenu from './SettingsMenu'
import LeafNodesDashboard from './LeafNodesDashboard'
import DeleteConfirmDialog from './DeleteConfirmDialog'

// 노드 타입 정의
const nodeTypes = {
  custom: EnhancedNode,
}

// 엣지 타입 정의
const edgeTypes = {
  labeled: SimpleEdgeLabel,
}

// dagre 그래프 설정
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

// 레이아웃 계산 함수
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB', isExpanded = false) => {
  // 확장 상태에 따라 노드 크기를 다르게 설정
  const nodeWidth = isExpanded ? 280 : 200
  const nodeHeight = isExpanded ? 150 : 100
  
  // 확장 시 노드 간격도 늘림
  const rankSeparation = isExpanded ? 150 : 100
  const nodeSeparation = isExpanded ? 100 : 60

  dagreGraph.setGraph({ rankdir: direction, ranksep: rankSeparation, nodesep: nodeSeparation })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

const GraphCanvas: React.FC = () => {
  const { branches, currentBranchId, switchBranch, initializeWithDummyData, createNewSession, createSummaryNode, createReferenceNode, deleteNodes, undo, redo, canUndo, canRedo, edgeLabels, updateEdgeLabel, sessionName, updateSessionName } = useConversationStore()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [globalExpanded, setGlobalExpanded] = React.useState(false)
  const [individualExpandedNodes, setIndividualExpandedNodes] = React.useState<Set<string>>(new Set())
  const [selectedNodes, setSelectedNodes] = React.useState<string[]>([])
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{ x: number; y: number } | null>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempSessionName, setTempSessionName] = useState(sessionName)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false)
  const [nodesToDelete, setNodesToDelete] = useState<string[]>([])

  // 개별 노드 확장 토글 핸들러
  const handleNodeExpand = useCallback((nodeId: string, expanded: boolean) => {
    setIndividualExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (expanded) {
        newSet.add(nodeId)
      } else {
        newSet.delete(nodeId)
      }
      return newSet
    })
  }, [])

  // 초기 더미 데이터 로드
  useEffect(() => {
    initializeWithDummyData()
  }, [])

  // 브랜치 데이터를 React Flow 노드/엣지로 변환
  useEffect(() => {
    if (branches.length === 0) return
    
    // 현재 선택된 노드가 머지 노드인지 확인하고 관련 노드 찾기
    const currentBranch = branches.find(b => b.id === currentBranchId)
    const relatedNodeIds = new Set<string>()
    if (currentBranch?.isMerge && currentBranch.parentIds) {
      currentBranch.parentIds.forEach(id => relatedNodeIds.add(id))
    }

    // 노드 생성
    const initialNodes: Node[] = branches.map((branch) => ({
      id: branch.id,
      type: 'custom',
      position: { x: 0, y: 0 }, // dagre가 재배치할 것
      data: {
        label: branch.title,
        type: branch.type,
        status: branch.status,
        messageCount: branch.messages.length,
        tokenCount: branch.tokenCount,
        summary: branch.summary,
        keyPoints: branch.keyPoints,
        charts: branch.charts,
        isMerge: branch.isMerge || false,
        parentIds: branch.parentIds,
        globalExpanded,
        isIndividualExpanded: individualExpandedNodes.has(branch.id),
        isRelatedToSelectedMerge: relatedNodeIds.has(branch.id),
        onExpandToggle: handleNodeExpand,
      },
    }))

    // 엣지 생성
    const initialEdges: Edge[] = []
    
    branches.forEach(branch => {
      // 머지 노드의 경우 여러 부모로부터 엣지 생성
      if (branch.parentIds && branch.parentIds.length > 0) {
        branch.parentIds.forEach(parentId => {
          const edgeId = `${parentId}-${branch.id}`
          const parentBranch = branches.find(b => b.id === parentId)
          initialEdges.push({
            id: edgeId,
            source: parentId,
            target: branch.id,
            type: 'labeled',
            animated: false,
            data: {
              label: edgeLabels[edgeId] || '',
              metadata: {
                createdAt: branch.createdAt,
                messageCount: branch.messages.length,
                reason: branch.isMerge ? '브랜치 통합' : undefined,
              },
              onLabelChange: updateEdgeLabel,
            },
          })
        })
      } 
      // 일반 노드의 경우 단일 부모로부터 엣지 생성
      else if (branch.parentId) {
        const edgeId = `${branch.parentId}-${branch.id}`
        initialEdges.push({
          id: edgeId,
          source: branch.parentId,
          target: branch.id,
          type: 'labeled',
          animated: false,
          data: {
            label: edgeLabels[edgeId] || '',
            metadata: {
              createdAt: branch.createdAt,
              messageCount: branch.messages.length,
            },
            onLabelChange: updateEdgeLabel,
          },
        })
      }
    })

    // dagre 레이아웃 적용 - 확장 상태 전달
    // 하나라도 확장된 노드가 있으면 레이아웃을 확장 모드로 계산
    const hasExpandedNodes = globalExpanded || individualExpandedNodes.size > 0
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'TB',
      hasExpandedNodes
    )

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
    
    // 새 노드가 생성되면 해당 노드로 포커스 이동
    // 브랜치 수가 변경되었을 때만 실행
    if (reactFlowInstance && currentBranchId) {
      const currentNode = layoutedNodes.find(n => n.id === currentBranchId)
      if (currentNode) {
        // fitView를 먼저 실행한 후 센터로 이동
        reactFlowInstance.fitView({ padding: 0.2, duration: 400 })
        setTimeout(() => {
          reactFlowInstance.setCenter(currentNode.position.x + 100, currentNode.position.y + 50, {
            duration: 800,
            zoom: 1,
          })
        }, 500)
      }
    }
  }, [branches, currentBranchId, globalExpanded, individualExpandedNodes, handleNodeExpand, setNodes, setEdges, reactFlowInstance, edgeLabels, updateEdgeLabel])

  // 노드 클릭 핸들러
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        // 다중 선택
        setSelectedNodes(prev => {
          if (prev.includes(node.id)) {
            return prev.filter(id => id !== node.id)
          }
          return [...prev, node.id]
        })
      } else {
        // 단일 선택
        setSelectedNodes([node.id])
        switchBranch(node.id)
      }
    },
    [switchBranch]
  )
  
  // 우클릭 핸들러
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      event.stopPropagation()
      
      // 선택된 노드가 없거나 현재 노드가 선택되지 않았다면 현재 노드를 선택
      if (selectedNodes.length === 0 || !selectedNodes.includes(node.id)) {
        setSelectedNodes([node.id])
      }
      
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
    },
    [selectedNodes]
  )
  
  // 배경 클릭 핸들러
  const onPaneClick = useCallback(() => {
    setSelectedNodes([])
    setContextMenuPosition(null)
  }, [])
  
  // 배경 우클릭 핸들러
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenuPosition(null)
  }, [])
  
  // 요약 노드 생성 핸들러
  const handleCreateSummary = useCallback((nodeIds?: string[], instructions?: string) => {
    const targetNodes = nodeIds || selectedNodes
    if (targetNodes.length > 1) {
      if (instructions) {
        // 지침 기반 요약
        const summaryNodeId = createSummaryNode(targetNodes, instructions)
        if (summaryNodeId) {
          // 생성된 노드로 포커스
          setTimeout(() => {
            if (reactFlowInstance) {
              const node = nodes.find(n => n.id === summaryNodeId)
              if (node) {
                reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, {
                  duration: 800,
                  zoom: 1,
                })
              }
            }
          }, 100)
        }
      } else {
        // 자동 요약
        createSummaryNode(targetNodes)
      }
      setSelectedNodes([])
    }
    setContextMenuPosition(null)
    setSummaryDialogOpen(false)
  }, [selectedNodes, createSummaryNode, reactFlowInstance, nodes])
  
  // 요약 다이얼로그 열기
  const handleOpenSummaryDialog = useCallback(() => {
    if (selectedNodes.length > 1) {
      setSummaryDialogOpen(true)
    }
    setContextMenuPosition(null)
  }, [selectedNodes])
  
  // 참조 노드 생성 핸들러
  const handleCreateReference = useCallback(() => {
    if (selectedNodes.length > 0) {
      // 3개 이상의 노드를 참조할 경우 자동으로 요약 노드 생성
      if (selectedNodes.length >= 3) {
        const summaryNodeId = createSummaryNode(selectedNodes)
        if (summaryNodeId) {
          createReferenceNode([summaryNodeId])
        }
      } else {
        createReferenceNode(selectedNodes)
      }
      setSelectedNodes([])
    }
    setContextMenuPosition(null)
  }, [selectedNodes, createSummaryNode, createReferenceNode])
  
  // 노드 삭제 핸들러
  const handleDeleteNodes = useCallback(() => {
    if (selectedNodes.length > 0) {
      // 선택된 노드들 중 자식이 있는 노드가 있는지 확인
      const hasChildrenNodes = selectedNodes.filter(nodeId => {
        return branches.some(b => 
          b.parentId === nodeId || b.parentIds?.includes(nodeId)
        )
      })
      
      if (hasChildrenNodes.length > 0) {
        // 자식이 있는 노드가 있으면 확인 다이얼로그 표시
        setNodesToDelete(selectedNodes)
        setDeleteConfirmDialogOpen(true)
      } else {
        // 자식이 없으면 바로 삭제
        deleteNodes(selectedNodes)
        setSelectedNodes([])
      }
    }
    setContextMenuPosition(null)
  }, [selectedNodes, deleteNodes, branches])
  
  // 삭제 확인 후 실제 삭제 실행
  const handleConfirmDelete = useCallback(() => {
    if (nodesToDelete.length > 0) {
      // 선택된 노드들과 모든 자손들을 찾아서 삭제
      const allNodesToDelete = new Set<string>()
      
      const getDescendants = (nodeId: string) => {
        const queue = [nodeId]
        while (queue.length > 0) {
          const currentId = queue.shift()!
          allNodesToDelete.add(currentId)
          
          // 현재 노드의 자식들 찾기
          const children = branches.filter(b => 
            b.parentId === currentId || b.parentIds?.includes(currentId)
          )
          
          children.forEach(child => {
            if (!allNodesToDelete.has(child.id)) {
              queue.push(child.id)
            }
          })
        }
      }
      
      // 각 선택된 노드와 그 자손들을 모두 찾기
      nodesToDelete.forEach(nodeId => getDescendants(nodeId))
      
      // 모든 노드 삭제
      deleteNodes(Array.from(allNodesToDelete))
      setSelectedNodes([])
      setNodesToDelete([])
    }
    setDeleteConfirmDialogOpen(false)
  }, [nodesToDelete, deleteNodes, branches])
  
  // 키보드 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          undo()
        }
      }
      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y
      else if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
               ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
      }
      // Delete: Delete key
      else if (e.key === 'Delete' && selectedNodes.length > 0) {
        e.preventDefault()
        handleDeleteNodes()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo, handleDeleteNodes, selectedNodes])

  // 엣지 연결 핸들러
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ 
        ...params, 
        type: 'labeled',
        data: {
          label: '',
          onLabelChange: updateEdgeLabel,
        }
      }, eds))
    },
    [setEdges, updateEdgeLabel]
  )

  // 현재 브랜치와 부모 브랜치들 하이라이트
  useEffect(() => {
    if (edges.length === 0) return
    
    // 선택된 브랜치의 모든 부모 찾기
    const getAncestorIds = (branchId: string): Set<string> => {
      const ancestors = new Set<string>()
      let current = branches.find(b => b.id === branchId)
      
      while (current) {
        ancestors.add(current.id)
        current = current.parentId 
          ? branches.find(b => b.id === current.parentId)
          : undefined
      }
      
      return ancestors
    }
    
    const ancestorIds = getAncestorIds(currentBranchId)
    
    // 노드 업데이트
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: selectedNodes.includes(node.id) || node.id === currentBranchId,
        data: {
          ...node.data,
          isAncestor: ancestorIds.has(node.id),
          isMultiSelected: selectedNodes.includes(node.id),
        }
      }))
    )
    
    // 엣지 업데이트 - 경로 강조 및 스타일 적용
    setEdges((eds) =>
      eds.map((edge) => {
        const isInPath = ancestorIds.has(edge.source) && ancestorIds.has(edge.target)
        const targetBranch = branches.find(b => b.id === edge.target)
        const isMergeEdge = targetBranch?.parentIds && targetBranch.parentIds.length > 1
        
        return {
          ...edge,
          animated: isInPath,
          style: {
            strokeWidth: isInPath ? 2 : 1.5,
            stroke: isInPath ? '#6366f1' : '#94a3b8',
            strokeDasharray: isMergeEdge ? '5 5' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: isInPath ? '#6366f1' : '#94a3b8',
          },
        }
      })
    )
  }, [currentBranchId, branches, edges.length, selectedNodes, setNodes, setEdges])

  return (
    <Box
      ref={graphContainerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#fafafa',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.Bezier}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        attributionPosition="bottom-left"
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
          color="#ddd"
        />
        
        <Controls />
        
        <MiniMap
          nodeColor={(node) => {
            return nodeTypeColors[node.data?.type as keyof typeof nodeTypeColors] || nodeTypeColors.default
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #ddd',
          }}
          maskColor="rgb(50, 50, 50, 0.1)"
        />
        
        <Panel position="top-left">
          <StyledPanel sx={{ p: 1.5, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              {isEditingName ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    value={tempSessionName}
                    onChange={(e) => setTempSessionName(e.target.value)}
                    size="small"
                    autoFocus
                    variant="standard"
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: uiColors.textPrimary,
                      },
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updateSessionName(tempSessionName)
                        setIsEditingName(false)
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      updateSessionName(tempSessionName)
                      setIsEditingName(false)
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <CheckIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setTempSessionName(sessionName)
                      setIsEditingName(false)
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ color: uiColors.textPrimary, fontWeight: 600 }}>
                    {sessionName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setTempSessionName(sessionName)
                      setIsEditingName(true)
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <SettingsMenu />
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Tooltip title="실행 취소 (Ctrl+Z)">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={undo}
                      disabled={!canUndo()}
                      sx={{ p: 0.5 }}
                    >
                      <UndoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="다시 실행 (Ctrl+Shift+Z)">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={redo}
                      disabled={!canRedo()}
                      sx={{ p: 0.5 }}
                    >
                      <RedoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={globalExpanded ? "전체 축소" : "전체 확장"}>
                  <IconButton 
                    size="small" 
                    onClick={() => setGlobalExpanded(!globalExpanded)}
                    sx={{ p: 0.5 }}
                  >
                    {globalExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
              <StyledButton
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={createNewSession}
                sx={{ fontSize: '11px', py: 0.5, px: 1.5 }}
              >
                새 세션
              </StyledButton>
              <StyledButton
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={initializeWithDummyData}
                sx={{ fontSize: '11px', py: 0.5, px: 1.5 }}
              >
                예제
              </StyledButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <StyledChip 
                size="small" 
                label={`노드: ${nodes.length}`}
                sx={{ 
                  backgroundColor: '#f0f0f0',
                  color: uiColors.textSecondary,
                  height: 20,
                  fontSize: '10px',
                }}
              />
              <StyledChip 
                size="small" 
                label={`연결: ${edges.length}`}
                sx={{ 
                  backgroundColor: '#f0f0f0',
                  color: uiColors.textSecondary,
                  height: 20,
                  fontSize: '10px',
                }}
              />
            </Box>
            
            {/* 리프 노드 대시보드 */}
            <LeafNodesDashboard
              onNodeClick={(nodeId) => {
                // 노드로 포커스 이동
                if (reactFlowInstance) {
                  const node = nodes.find(n => n.id === nodeId)
                  if (node) {
                    reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, {
                      duration: 800,
                      zoom: 1,
                    })
                  }
                }
              }}
            />
          </StyledPanel>
        </Panel>
      </ReactFlow>
      
      <ContextMenu
        position={contextMenuPosition}
        onClose={() => setContextMenuPosition(null)}
        selectedNodes={selectedNodes}
        onCreateSummary={() => handleCreateSummary()}
        onCreateReference={handleCreateReference}
        onDelete={handleDeleteNodes}
        onOpenSummaryDialog={handleOpenSummaryDialog}
      />
      
      <SummaryDialog
        open={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        selectedNodes={selectedNodes}
        branches={branches}
        onCreateSummary={handleCreateSummary}
      />
      
      <DeleteConfirmDialog
        open={deleteConfirmDialogOpen}
        onClose={() => {
          setDeleteConfirmDialogOpen(false)
          setNodesToDelete([])
        }}
        onConfirm={handleConfirmDelete}
        selectedNodes={nodesToDelete}
        branches={branches}
      />
    </Box>
  )
}

export default GraphCanvas