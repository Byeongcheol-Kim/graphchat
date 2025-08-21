import dagre from 'dagre'
import { Node, Edge } from '@xyflow/react'

// dagre 그래프 설정
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

// 레이아웃 계산 함수
export const getLayoutedElements = (
  nodes: Node[], 
  edges: Edge[], 
  direction = 'TB', 
  isExpanded = false
) => {
  // 확장 상태에 따라 노드 크기를 다르게 설정
  const nodeWidth = isExpanded ? 280 : 200
  const nodeHeight = isExpanded ? 150 : 100
  
  // 확장 시 노드 간격도 늘림
  const rankSeparation = isExpanded ? 150 : 100
  const nodeSeparation = isExpanded ? 100 : 60

  dagreGraph.setGraph({ 
    rankdir: direction, 
    ranksep: rankSeparation, 
    nodesep: nodeSeparation 
  })

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