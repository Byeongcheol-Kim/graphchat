import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface SimpleNodeData {
  label: string
  type: 'root' | 'main' | 'topic' | 'exploration' | 'question' | 'solution' | 'summary' | 'reference'
  status: 'active' | 'paused' | 'completed'
  messageCount: number
  isAncestor?: boolean
  isSummary?: boolean
  isReference?: boolean
  sourceNodeIds?: string[]
}

const getNodeStyle = (data: SimpleNodeData, selected: boolean) => {
  let backgroundColor = '#ffffff'
  let borderColor = '#b1b1b7'
  let color = '#000000'
  
  // 타입별 색상
  switch (data.type) {
    case 'root':
      backgroundColor = '#64748b'
      color = '#ffffff'
      break
    case 'main':
      backgroundColor = '#6366f1'
      color = '#ffffff'
      break
    case 'topic':
      backgroundColor = '#8b5cf6'
      color = '#ffffff'
      break
    case 'exploration':
      backgroundColor = '#06b6d4'
      color = '#ffffff'
      break
    case 'question':
      backgroundColor = '#10b981'
      color = '#ffffff'
      break
    case 'solution':
      backgroundColor = '#f59e0b'
      color = '#ffffff'
      break
    case 'summary':
      backgroundColor = '#e91e63'
      color = '#ffffff'
      break
    case 'reference':
      backgroundColor = '#9333ea'
      color = '#ffffff'
      break
  }
  
  // 선택된 노드
  if (selected) {
    borderColor = '#ff0072'
  } else if (data.isAncestor) {
    borderColor = '#6366f1'
  }
  
  // 요약/참조 노드는 특별한 테두리 스타일
  if (data.isSummary || data.isReference) {
    borderColor = selected ? '#ff0072' : data.isSummary ? '#c2185b' : '#7c3aed'
  }
  
  // 상태별 투명도
  let opacity = 1
  if (data.status === 'paused') {
    opacity = 0.6
  } else if (data.status === 'completed') {
    opacity = 0.8
  }
  
  return {
    backgroundColor,
    borderColor,
    color,
    opacity,
    borderWidth: (data.isSummary || data.isReference) ? 3 : selected ? 3 : data.isAncestor ? 2 : 1,
  }
}

const SimpleNode: React.FC<NodeProps<SimpleNodeData>> = ({ data, selected }) => {
  const style = getNodeStyle(data, selected)
  
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#555',
          width: 8,
          height: 8,
        }}
      />
      
      <div
        style={{
          padding: '10px 15px',
          borderRadius: (data.isSummary || data.isReference) ? '12px' : '8px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: style.backgroundColor,
          border: `${style.borderWidth}px solid ${style.borderColor}`,
          borderStyle: (data.isSummary || data.isReference) ? 'dashed' : 'solid',
          color: style.color,
          opacity: style.opacity,
          minWidth: '150px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        {data.isSummary && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: style.backgroundColor,
            padding: '0 4px',
            fontSize: '9px',
            fontWeight: 'bold',
            borderRadius: '4px',
          }}>
            SUMMARY
          </div>
        )}
        {data.isReference && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: style.backgroundColor,
            padding: '0 4px',
            fontSize: '9px',
            fontWeight: 'bold',
            borderRadius: '4px',
          }}>
            REFERENCE
          </div>
        )}
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {data.label}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          {data.messageCount} messages
        </div>
        {data.status !== 'active' && (
          <div style={{ 
            fontSize: '9px', 
            marginTop: '4px',
            padding: '2px 6px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            {data.status}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#555',
          width: 8,
          height: 8,
        }}
      />
    </>
  )
}

export default memo(SimpleNode)