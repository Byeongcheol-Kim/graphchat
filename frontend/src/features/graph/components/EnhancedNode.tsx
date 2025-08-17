import React, { memo, useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { 
  ChevronRight, 
  ChevronDown, 
  MessageSquare, 
  Zap,
  GitMerge,
  Brain,
  Search,
  HelpCircle,
  Lightbulb,
  Activity
} from 'lucide-react'
import { getNodeTypeColor, getStatusColor, borderRadius, shadows, fontSize } from '@shared/theme'

interface EnhancedNodeData {
  label: string
  type: 'main' | 'topic' | 'exploration' | 'question' | 'solution' | 'merge'
  status: 'active' | 'paused' | 'completed'
  messageCount: number
  tokenCount?: number
  summary?: string
  keyPoints?: string[]
  charts?: { type: 'flow' | 'table' | 'list'; content: any }[]
  isAncestor?: boolean
  isMerge?: boolean
  globalExpanded?: boolean
  isIndividualExpanded?: boolean
  isMultiSelected?: boolean
  isRelatedToSelectedMerge?: boolean
  parentIds?: string[]
  onExpandToggle?: (nodeId: string, expanded: boolean) => void
}

const getTypeIcon = (type: string) => {
  const iconProps = { size: 14, color: 'white' }
  switch (type) {
    case 'main': return <Activity {...iconProps} />
    case 'topic': return <Brain {...iconProps} />
    case 'exploration': return <Search {...iconProps} />
    case 'question': return <HelpCircle {...iconProps} />
    case 'solution': return <Lightbulb {...iconProps} />
    case 'merge': return <GitMerge {...iconProps} />
    default: return <MessageSquare {...iconProps} />
  }
}

const getStatusBadge = (status: string) => {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: borderRadius.full,
        backgroundColor: getStatusColor(status),
        border: '2px solid white',
      }}
    />
  )
}

const formatTokenCount = (count?: number) => {
  if (!count) return '0'
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}k`
}

const EnhancedNode: React.FC<NodeProps> = ({ data, selected, id }) => {
  const nodeData = data as EnhancedNodeData
  const [localExpanded, setLocalExpanded] = useState(nodeData.isIndividualExpanded || false)
  const typeColor = getNodeTypeColor(nodeData.type)
  
  // 전체 확장 상태가 있으면 그것을 우선시, 없으면 개별 상태 사용
  const isExpanded = nodeData.globalExpanded ?? localExpanded
  
  // props가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setLocalExpanded(nodeData.isIndividualExpanded || false)
  }, [nodeData.isIndividualExpanded])
  
  const borderStyle = {
    borderWidth: selected ? 3 : nodeData.isRelatedToSelectedMerge ? 2.5 : nodeData.isMultiSelected ? 2.5 : nodeData.isAncestor ? 2 : 1,
    borderColor: selected ? '#ff0072' : nodeData.isRelatedToSelectedMerge ? '#10b981' : nodeData.isMultiSelected ? '#3b82f6' : nodeData.isAncestor ? typeColor : '#e5e7eb',
    borderStyle: nodeData.isMerge ? 'dashed' : 'solid',
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#94a3b8',
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
      
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: borderRadius.lg,
          boxShadow: selected 
            ? shadows.lg 
            : nodeData.isRelatedToSelectedMerge
              ? shadows.md
              : nodeData.isMultiSelected
                ? shadows.md
                : nodeData.isAncestor 
                  ? shadows.md
                  : shadows.sm,
          overflow: 'hidden',
          minWidth: isExpanded ? '240px' : '180px',
          maxWidth: isExpanded ? '300px' : '200px',
          transition: 'all 0.3s ease',
          ...borderStyle,
        }}
      >
        {/* 헤더 영역 */}
        <div
          style={{
            backgroundColor: typeColor,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getTypeIcon(nodeData.type)}
            <span style={{ fontWeight: 600, fontSize: fontSize.md }}>
              {nodeData.label}
            </span>
          </div>
          {getStatusBadge(nodeData.status)}
        </div>

        {/* 바디 영역 */}
        <div style={{ padding: '8px' }}>
          {/* 통계 정보 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '6px',
              fontSize: fontSize.sm,
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <MessageSquare size={10} />
              <span>{nodeData.messageCount}</span>
            </div>
            {nodeData.tokenCount && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Zap size={10} />
                <span>{formatTokenCount(nodeData.tokenCount)}</span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newExpanded = !localExpanded
                setLocalExpanded(newExpanded)
                if (nodeData.onExpandToggle) {
                  nodeData.onExpandToggle(id, newExpanded)
                }
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: nodeData.globalExpanded ? '#6366f1' : '#94a3b8',
                padding: '0',
                opacity: nodeData.globalExpanded ? 0.5 : 1,
              }}
              title={nodeData.globalExpanded ? "전체 확장 모드 활성화됨" : "개별 확장/축소"}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {/* 요약 정보 */}
          {nodeData.summary && (
            <div
              style={{
                fontSize: fontSize.sm,
                color: '#475569',
                marginBottom: isExpanded ? '6px' : '0',
                lineHeight: '1.3',
                display: '-webkit-box',
                WebkitLineClamp: isExpanded ? 'none' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {nodeData.summary}
            </div>
          )}

          {/* 확장된 상태에서 추가 정보 표시 */}
          {isExpanded && (
            <>
              {/* 주요 포인트 */}
              {nodeData.keyPoints && nodeData.keyPoints.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div
                    style={{
                      fontSize: fontSize.xs,
                      fontWeight: 600,
                      color: '#64748b',
                      marginBottom: '4px',
                    }}
                  >
                    주요 포인트
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '14px',
                      fontSize: fontSize.xs,
                      color: '#475569',
                      lineHeight: '1.4',
                    }}
                  >
                    {nodeData.keyPoints.slice(0, 3).map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 차트/표 미리보기 */}
              {nodeData.charts && nodeData.charts.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  {nodeData.charts[0].type === 'flow' && (
                    <div
                      style={{
                        padding: '8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: borderRadius.sm,
                        fontSize: fontSize.xs,
                        fontFamily: 'monospace',
                        color: '#64748b',
                        textAlign: 'center',
                      }}
                    >
                      {nodeData.charts[0].content}
                    </div>
                  )}
                  {nodeData.charts[0].type === 'table' && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: borderRadius.sm,
                        overflow: 'hidden',
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          fontSize: fontSize.xs,
                          borderCollapse: 'collapse',
                        }}
                      >
                        <tbody>
                          {nodeData.charts[0].content.slice(0, 3).map((row: any[], idx: number) => (
                            <tr key={idx}>
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  style={{
                                    padding: '4px 8px',
                                    borderBottom: idx < nodeData.charts![0].content.length - 1 ? '1px solid #e5e7eb' : 'none',
                                    color: idx === 0 ? '#475569' : '#64748b',
                                    fontWeight: idx === 0 ? 600 : 400,
                                  }}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {nodeData.charts[0].type === 'list' && (
                    <div
                      style={{
                        padding: '8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      {nodeData.charts[0].content.slice(0, 3).map((item: string, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: fontSize.xs,
                            color: '#64748b',
                            padding: '2px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <div
                            style={{
                              width: '4px',
                              height: '4px',
                              backgroundColor: typeColor,
                              borderRadius: borderRadius.full,
                            }}
                          />
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#94a3b8',
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />
    </>
  )
}

export default memo(EnhancedNode)