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
import '@xyflow/react/dist/style.css'
import { Box } from '@mui/material'
import { useConversationStore } from '@store/conversationStore'
import { uiColors } from '@shared/theme'
import { colorThemes } from '@shared/theme/colors'
import { useThemeColor } from '@shared/hooks/useThemeColor'
import EnhancedNode from './EnhancedNode'
import ContextMenu from './ContextMenu'
import SimpleEdgeLabel from './SimpleEdgeLabel'
import SummaryDialog from './SummaryDialog'
import LeafNodesDashboard from './LeafNodesDashboard'
import DeleteConfirmDialog from './DeleteConfirmDialog'
import GraphToolbar from './GraphToolbar'
import { getLayoutedElements } from '../utils/graphLayout'
import { useWebSocketEvents } from '@/hooks/useWebSocketEvents'

// 노드 타입 정의
const nodeTypes = {
  custom: EnhancedNode,
}

// 엣지 타입 정의
const edgeTypes = {
  labeled: SimpleEdgeLabel,
}

const GraphCanvas: React.FC = () => {
  const { branches, currentBranchId, switchBranch, createNewSession, createIndependentNode, createSummaryNode, createReferenceNode, deleteNodes, undo, redo, canUndo, canRedo, edgeLabels, updateEdgeLabel, sessionName, updateSessionName, settings } = useConversationStore()
  const { getNodeTypeColor, colorTheme } = useThemeColor()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [globalExpanded, setGlobalExpanded] = React.useState(false)
  
  // WebSocket 이벤트 처리 (노드 삭제 등)
  useWebSocketEvents(currentBranchId)
  const [individualExpandedNodes, setIndividualExpandedNodes] = React.useState<Set<string>>(new Set())
  const [selectedNodes, setSelectedNodes] = React.useState<string[]>([])
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{ x: number; y: number } | null>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false)
  const [nodesToDelete, setNodesToDelete] = useState<string[]>([])
  const [sessionPanelCollapsed, setSessionPanelCollapsed] = useState(false)
  
  // 강제 리렌더링을 위한 forceUpdate
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  
  // 리프 노드 계산 (자식이 없고 완료되지 않은 노드)
  const leafNodesCount = React.useMemo(() => {
    const hasChildren = new Set<string>()
    branches.forEach(branch => {
      // 일반 부모 체크 (parentId 또는 parent_id)
      const parentId = branch.parentId || (branch as any).parent_id
      if (parentId) hasChildren.add(parentId)
      // 요약 노드의 소스들 체크 (sourceNodeIds 또는 source_node_ids)
      const sourceIds = branch.sourceNodeIds || (branch as any).source_node_ids || (branch as any).parentIds
      if (sourceIds) {
        sourceIds.forEach((id: string) => hasChildren.add(id))
      }
    })
    
    return branches.filter(branch => 
      !hasChildren.has(branch.id) && 
      branch.status !== 'completed'
    ).length
  }, [branches])

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

  // 초기 데이터는 App.tsx에서 세션 생성 후 로드됨
  // useEffect(() => {
  //   initializeWithDummyData()
  // }, [])

  // 이전 브랜치 개수를 추적하기 위한 ref
  const prevBranchCountRef = useRef(branches.length)
  
  // 브랜치 데이터를 React Flow 노드/엣지로 변환
  useEffect(() => {
    console.log('[GraphCanvas] branches 업데이트 감지, 개수:', branches.length)
    console.log('[GraphCanvas] branches:', branches.map(b => ({ id: b.id, title: b.title, parentId: b.parentId })))
    
    if (branches.length === 0) {
      // 노드가 모두 삭제된 경우 빈 그래프 표시
      setNodes([])
      setEdges([])
      return
    }
    
    // 현재 선택된 노드가 유효한지 확인
    const validCurrentBranchId = branches.find(b => b.id === currentBranchId) ? currentBranchId : null
    
    // 현재 선택된 노드가 요약 노드인지 확인하고 관련 노드 찾기
    const currentBranch = validCurrentBranchId ? branches.find(b => b.id === validCurrentBranchId) : null
    const relatedNodeIds = new Set<string>()
    const sourceIds = (currentBranch as any)?.sourceNodeIds || (currentBranch as any)?.parentIds
    if (((currentBranch as any)?.isSummary || (currentBranch as any)?.isMerge) && sourceIds) {
      sourceIds.forEach(id => relatedNodeIds.add(id))
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
        messageCount: branch.messages?.length || 0,  // undefined 체크 추가
        tokenCount: branch.tokenCount || 0,  // undefined 체크 추가
        summary: branch.summary || (branch as any).summaryContent || (branch as any).metadata?.summary,
        keyPoints: branch.keyPoints,
        charts: branch.charts,
        isMerge: (branch as any).isMerge || (branch as any).isSummary || false,
        parentIds: (branch as any).parentIds || (branch as any).sourceNodeIds,
        globalExpanded,
        isIndividualExpanded: individualExpandedNodes.has(branch.id),
        isRelatedToSelectedMerge: relatedNodeIds.has(branch.id),
        onExpandToggle: handleNodeExpand,
      },
    }))

    // 엣지 생성
    const initialEdges: Edge[] = []
    
    console.log('[GraphCanvas] 엣지 생성 시작, branches:', branches.map(b => ({
      id: b.id,
      parentId: b.parentId,
      sourceNodeIds: (b as any).sourceNodeIds,
      parentIds: (b as any).parentIds
    })))
    
    branches.forEach(branch => {
      // 요약 노드의 경우 여러 소스 노드로부터 엣지 생성
      // parentIds (legacy) 또는 sourceNodeIds (new) 체크
      const sourceIds = (branch as any).sourceNodeIds || (branch as any).parentIds || (branch as any).source_node_ids
      
      // 디버깅: 요약/참조 노드 확인
      if ((branch as any).isSummary || (branch as any).isReference || branch.type === 'summary' || branch.type === 'reference') {
        console.log(`[GraphCanvas] 요약/참조 노드 발견: ${branch.id}`, {
          type: branch.type,
          isSummary: (branch as any).isSummary,
          isReference: (branch as any).isReference,
          sourceNodeIds: (branch as any).sourceNodeIds,
          source_node_ids: (branch as any).source_node_ids,
          parentIds: (branch as any).parentIds,
          parentId: branch.parentId
        })
      }
      
      if (sourceIds && sourceIds.length > 0) {
        const isSummary = (branch as any).isSummary || branch.type === 'summary'
        const isReference = (branch as any).isReference || branch.type === 'reference'
        
        sourceIds.forEach(sourceId => {
          const edgeId = `${sourceId}-${branch.id}`
          const sourceBranch = branches.find(b => b.id === sourceId)
          console.log(`[GraphCanvas] ${isSummary ? '요약' : isReference ? '참조' : '일반'} 노드 엣지 생성: ${sourceId} -> ${branch.id}`)
          initialEdges.push({
            id: edgeId,
            source: sourceId,
            target: branch.id,
            type: 'labeled',
            animated: false,  // 기본적으로 애니메이션 없음
            style: isSummary ? {
              stroke: '#DC7F50',  // 차분한 주황색 (요약)
              strokeWidth: 2,
              strokeDasharray: '8 4',  // 더 뚜렷한 점선
            } : isReference ? {
              stroke: '#5C9EAD',  // 차분한 청록색 (참조)
              strokeWidth: 2,
              strokeDasharray: '3 3',  // 짧은 점선
            } : undefined,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: isSummary ? '#DC7F50' : isReference ? '#5C9EAD' : '#94a3b8',
            },
            data: {
              label: isSummary ? '요약' : isReference ? '참조' : edgeLabels[edgeId] || '',
              metadata: {
                createdAt: branch.createdAt,
                messageCount: branch.messages?.length || 0,
                reason: isSummary ? '노드 요약' : isReference ? '노드 참조' : undefined,
                edgeType: isSummary ? 'summary' : isReference ? 'reference' : 'normal',
              },
              onLabelChange: updateEdgeLabel,
            },
          })
        })
      } 
      // 일반 노드의 경우 단일 부모로부터 엣지 생성
      else if (branch.parentId) {
        const edgeId = `${branch.parentId}-${branch.id}`
        console.log(`[GraphCanvas] 일반 노드 엣지 생성: ${branch.parentId} -> ${branch.id}`)
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
              messageCount: branch.messages?.length ?? 0,
            },
            onLabelChange: updateEdgeLabel,
          },
        })
      } else {
        console.log(`[GraphCanvas] 엣지 생성 실패 - parentId 없음: ${branch.id}`)
      }
    })
    
    console.log('[GraphCanvas] 생성된 엣지 수:', initialEdges.length, initialEdges)

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
    // 브랜치 수가 증가했을 때만 실행
    if (reactFlowInstance && currentBranchId && branches.length > prevBranchCountRef.current) {
      const currentNode = layoutedNodes.find(n => n.id === currentBranchId)
      if (currentNode) {
        // 새 노드 생성 시에만 fitView 후 센터 이동
        reactFlowInstance.fitView({ padding: 0.2, duration: 200 })
        setTimeout(() => {
          reactFlowInstance.setCenter(currentNode.position.x + 100, currentNode.position.y + 50, {
            duration: 300,
            zoom: 1,
          })
        }, 250)
      }
    }
    
    // 브랜치 개수 업데이트
    prevBranchCountRef.current = branches.length
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
        
        // 기존 노드 선택 시 빠른 포커스 이동 (애니메이션 최소화)
        if (reactFlowInstance) {
          const targetNode = nodes.find(n => n.id === node.id)
          if (targetNode) {
            reactFlowInstance.setCenter(targetNode.position.x + 100, targetNode.position.y + 50, {
              duration: 200,
              zoom: reactFlowInstance.getZoom(),
            })
          }
        }
      }
    },
    [switchBranch, reactFlowInstance, nodes]
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
  
  // 배경 우클릭 핸들러 - 새 독립 노드 생성
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    
    // 컨텍스트 메뉴 위치 설정 (새 노드 생성용)
    setContextMenuPosition({ x: event.clientX, y: event.clientY })
    setSelectedNodes([]) // 선택된 노드 초기화
  }, [])
  
  // 요약 노드 생성 핸들러
  const handleCreateSummary = useCallback(async (nodeIds?: string[], instructions?: string) => {
    const targetNodes = nodeIds || selectedNodes
    if (targetNodes.length > 1) {
      let summaryNodeId: string | null = null
      if (instructions) {
        // 지침 기반 요약
        summaryNodeId = await createSummaryNode(targetNodes, instructions)
      } else {
        // 자동 요약
        summaryNodeId = await createSummaryNode(targetNodes)
      }
      
      if (summaryNodeId) {
        // 생성된 노드로 전환
        await switchBranch(summaryNodeId)
        
        // 생성된 노드로 빠른 포커스
        setTimeout(() => {
          if (reactFlowInstance) {
            const node = nodes.find(n => n.id === summaryNodeId)
            if (node) {
              reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, {
                duration: 300,
                zoom: 1,
              })
            }
          }
        }, 50)
      }
      setSelectedNodes([])
    }
    setContextMenuPosition(null)
    setSummaryDialogOpen(false)
  }, [selectedNodes, createSummaryNode, switchBranch, reactFlowInstance, nodes])
  
  // 요약 다이얼로그 열기
  const handleOpenSummaryDialog = useCallback(() => {
    if (selectedNodes.length > 1) {
      setSummaryDialogOpen(true)
    }
    setContextMenuPosition(null)
  }, [selectedNodes])
  
  // 참조 노드 생성 핸들러
  const handleCreateReference = useCallback(async () => {
    if (selectedNodes.length > 0) {
      let referenceNodeId: string | null = null
      
      // 3개 이상의 노드를 참조할 경우 자동으로 요약 노드 생성
      if (selectedNodes.length >= 3) {
        if (typeof createSummaryNode === 'function') {
          const summaryNodeId = await createSummaryNode(selectedNodes)
          if (summaryNodeId && typeof createReferenceNode === 'function') {
            referenceNodeId = await createReferenceNode([summaryNodeId])
          }
        }
      } else {
        if (typeof createReferenceNode === 'function') {
          referenceNodeId = await createReferenceNode(selectedNodes)
        } else {
          console.error('[GraphCanvas] createReferenceNode is not a function')
        }
      }
      
      if (referenceNodeId) {
        // 생성된 참조 노드로 전환
        await switchBranch(referenceNodeId)
      }
      
      setSelectedNodes([])
    }
    setContextMenuPosition(null)
  }, [selectedNodes, createSummaryNode, createReferenceNode, switchBranch])
  
  // 노드 삭제 핸들러
  const handleDeleteNodes = useCallback(async () => {
    if (selectedNodes.length > 0) {
      // 유효한 노드만 필터링
      const validNodes = selectedNodes.filter(nodeId => 
        branches.some(b => b.id === nodeId)
      )
      
      if (validNodes.length === 0) {
        setSelectedNodes([])
        setContextMenuPosition(null)
        return
      }
      
      // 선택된 노드들 중 자식이 있는 노드가 있는지 확인
      const hasChildrenNodes = validNodes.filter(nodeId => {
        return branches.some(b => {
          // 일반 부모 체크
          if (b.parentId === nodeId) return true
          // 요약 노드의 소스 체크
          const sourceIds = (b as any).sourceNodeIds || (b as any).parentIds
          if (sourceIds?.includes(nodeId)) return true
          return false
        })
      })
      
      if (hasChildrenNodes.length > 0) {
        // 자식이 있는 노드가 있으면 확인 다이얼로그 표시
        setNodesToDelete(validNodes)
        setDeleteConfirmDialogOpen(true)
      } else {
        // 자식이 없으면 바로 삭제 (하위 노드 포함 안 함)
        await deleteNodes(validNodes, false)
        setSelectedNodes([])
        // 삭제된 노드가 개별 확장 목록에 있다면 제거
        setIndividualExpandedNodes(prev => {
          const newSet = new Set(prev)
          validNodes.forEach(id => newSet.delete(id))
          return newSet
        })
        // 강제 리렌더링을 위한 트리거
        forceUpdate()
      }
    }
    setContextMenuPosition(null)
  }, [selectedNodes, deleteNodes, branches])
  
  // 삭제 확인 후 실제 삭제 실행
  const handleConfirmDelete = useCallback(async (includeDescendants: boolean) => {
    if (nodesToDelete.length > 0) {
      // 새로운 API를 사용하여 삭제
      await deleteNodes(nodesToDelete, includeDescendants)
      setSelectedNodes([])
      setNodesToDelete([])
      // 삭제된 노드가 개별 확장 목록에 있다면 제거
      setIndividualExpandedNodes(prev => {
        const newSet = new Set(prev)
        nodesToDelete.forEach(id => newSet.delete(id))
        return newSet
      })
      // 강제 리렌더링을 위한 트리거
      forceUpdate()
    }
    setDeleteConfirmDialogOpen(false)
  }, [nodesToDelete, deleteNodes])
  
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
        const sourceIds = (targetBranch as any)?.sourceNodeIds || (targetBranch as any)?.parentIds
        const isSummaryEdge = (targetBranch as any)?.isSummary || targetBranch?.type === 'summary'
        const isReferenceEdge = (targetBranch as any)?.isReference || targetBranch?.type === 'reference'
        
        // 선택된 노드와 직접 연결된 엣지인지 확인
        const isDirectlyConnected = edge.source === currentBranchId || edge.target === currentBranchId
        
        // 엣지의 기본 스타일 유지하면서 경로 강조
        let strokeColor = '#94a3b8'
        if (isSummaryEdge) {
          strokeColor = isInPath ? '#E89B6F' : '#DC7F50' // 경로상에서 약간 더 밝은 주황색
        } else if (isReferenceEdge) {
          strokeColor = isInPath ? '#6FB1C1' : '#5C9EAD' // 경로상에서 약간 더 밝은 청록색
        } else if (isInPath) {
          strokeColor = '#6366f1' // 일반 경로는 보라색
        }
        
        return {
          ...edge,
          animated: isDirectlyConnected, // 선택된 노드와 직접 연결된 엣지만 애니메이션
          style: {
            strokeWidth: isSummaryEdge || isReferenceEdge ? 2 : isInPath ? 2 : 1.5,
            stroke: strokeColor,
            strokeDasharray: isSummaryEdge ? '8 4' : isReferenceEdge ? '3 3' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: strokeColor,
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
            return getNodeTypeColor(node.data?.type)
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #ddd',
          }}
          maskColor="rgb(50, 50, 50, 0.1)"
        />
        
        <GraphToolbar
          sessionName={sessionName}
          updateSessionName={updateSessionName}
          createNewSession={createNewSession}
          globalExpanded={globalExpanded}
          setGlobalExpanded={setGlobalExpanded}
          leafNodesCount={leafNodesCount}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          collapsed={sessionPanelCollapsed}
          setCollapsed={setSessionPanelCollapsed}
        />
        
        <Panel position="top-left" style={{ top: sessionPanelCollapsed ? 60 : 120 }}>
          <LeafNodesDashboard
            onNodeClick={(nodeId) => {
              // 노드로 빠른 포커스 이동
              if (reactFlowInstance) {
                const node = nodes.find(n => n.id === nodeId)
                if (node) {
                  reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, {
                    duration: 200,
                    zoom: reactFlowInstance.getZoom(),
                  })
                }
              }
            }}
          />
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
        onCreateIndependentNode={async () => {
          if (typeof createIndependentNode !== 'function') {
            console.error('[GraphCanvas] createIndependentNode is not a function')
            return
          }
          const newNodeId = await createIndependentNode()
          setContextMenuPosition(null)
          // 새 노드로 빠른 포커스 이동
          setTimeout(() => {
            if (reactFlowInstance) {
              const node = nodes.find(n => n.id === newNodeId)
              if (node) {
                reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, {
                  duration: 300,
                  zoom: 1,
                })
              }
            }
          }, 50)
        }}
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