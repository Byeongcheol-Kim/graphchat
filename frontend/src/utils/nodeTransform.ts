/**
 * 백엔드 노드 데이터를 프론트엔드 형식으로 변환
 */
export function transformBackendNode(backendNode: any) {
  const parentId = backendNode.parent_id || backendNode.parentId || null
  
  // 요약/참조 노드는 parentId가 없고 sourceNodeIds를 가짐
  const sourceNodeIds = backendNode.source_node_ids || backendNode.sourceNodeIds
  const nodeType = backendNode.type
  
  // 디버깅: 요약/참조 노드 확인
  if (nodeType === 'summary' || nodeType === 'reference' || backendNode.is_summary || backendNode.is_reference) {
    console.log('[transformBackendNode] 요약/참조 노드:', {
      id: backendNode.id,
      type: nodeType,
      is_summary: backendNode.is_summary,
      is_reference: backendNode.is_reference,
      source_node_ids: backendNode.source_node_ids,
      sourceNodeIds: sourceNodeIds
    })
  }
  
  return {
    ...backendNode,
    // snake_case를 camelCase로 변환
    parentId,
    sessionId: backendNode.session_id || backendNode.sessionId,
    isActive: backendNode.is_active ?? backendNode.isActive,
    isSummary: backendNode.is_summary ?? backendNode.isSummary,
    isGenerating: backendNode.is_generating ?? backendNode.isGenerating ?? false,
    isMerge: backendNode.is_merge ?? backendNode.isMerge,
    isReference: backendNode.is_reference ?? backendNode.isReference,
    tokenCount: backendNode.token_count ?? backendNode.tokenCount,
    messageCount: backendNode.message_count ?? backendNode.messageCount,
    summaryContent: backendNode.summary_content || backendNode.summaryContent,
    sourceNodeIds,
    createdAt: backendNode.created_at || backendNode.createdAt 
      ? new Date(backendNode.created_at || backendNode.createdAt) 
      : new Date(),
    updatedAt: backendNode.updated_at || backendNode.updatedAt 
      ? new Date(backendNode.updated_at || backendNode.updatedAt) 
      : undefined,
    
    // snake_case 필드 제거
    parent_id: undefined,
    session_id: undefined,
    is_active: undefined,
    is_summary: undefined,
    is_generating: undefined,
    is_merge: undefined,
    is_reference: undefined,
    token_count: undefined,
    message_count: undefined,
    summary_content: undefined,
    source_node_ids: undefined,
    created_at: undefined,
    updated_at: undefined,
  }
}

/**
 * 프론트엔드 노드 데이터를 백엔드 형식으로 변환
 */
export function transformToBackendNode(frontendNode: any) {
  return {
    ...frontendNode,
    // camelCase를 snake_case로 변환
    parent_id: frontendNode.parentId,
    session_id: frontendNode.sessionId,
    is_active: frontendNode.isActive,
    is_summary: frontendNode.isSummary,
    is_generating: frontendNode.isGenerating,
    is_merge: frontendNode.isMerge,
    is_reference: frontendNode.isReference,
    token_count: frontendNode.tokenCount,
    message_count: frontendNode.messageCount,
    summary_content: frontendNode.summaryContent,
    source_node_ids: frontendNode.sourceNodeIds,
    created_at: frontendNode.createdAt?.toISOString(),
    updated_at: frontendNode.updatedAt?.toISOString(),
  }
}