import { Branch } from '@/types'

/**
 * Get all children of a node
 */
export const getNodeChildren = (nodeId: string, branches: Branch[]): Branch[] => {
  return branches.filter(branch => 
    branch.parentId === nodeId || 
    (branch as any).parentIds?.includes(nodeId) ||
    (branch as any).sourceNodeIds?.includes(nodeId)
  )
}

/**
 * Get all ancestors of a node
 */
export const getNodeAncestors = (nodeId: string, branches: Branch[]): Branch[] => {
  const ancestors: Branch[] = []
  let currentNode = branches.find(b => b.id === nodeId)
  
  while (currentNode?.parentId) {
    const parent = branches.find(b => b.id === currentNode!.parentId)
    if (parent) {
      ancestors.unshift(parent)
      currentNode = parent
    } else {
      break
    }
  }
  
  return ancestors
}

/**
 * Get all descendants of a node recursively
 * @param branches - All branches/nodes
 * @param nodeId - The ID of the node to get descendants for
 * @returns Array of descendant branches
 */
export const getNodeDescendants = (branches: Branch[], nodeId: string): Branch[] => {
  const descendants: Branch[] = []
  const visitedIds = new Set<string>()
  const queue = [nodeId]
  
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = branches.filter(b => 
      b.parentId === currentId || 
      (b as any).parentIds?.includes(currentId) ||
      (b as any).sourceNodeIds?.includes(currentId) ||
      (b as any).source_node_ids?.includes(currentId)
    )
    
    children.forEach(child => {
      if (!visitedIds.has(child.id)) {
        visitedIds.add(child.id)
        descendants.push(child)
        queue.push(child.id)
      }
    })
  }
  
  return descendants
}

/**
 * Get all leaf nodes (nodes without children)
 */
export const getLeafNodes = (branches: Branch[]): Branch[] => {
  const hasChildren = new Set<string>()
  
  branches.forEach(branch => {
    if (branch.parentId) {
      hasChildren.add(branch.parentId)
    }
    if (branch.parentIds) {
      branch.parentIds.forEach(id => hasChildren.add(id))
    }
  })
  
  return branches.filter(branch => !hasChildren.has(branch.id))
}

/**
 * Get active leaf nodes (excluding completed)
 */
export const getActiveLeafNodes = (branches: Branch[]): Branch[] => {
  return getLeafNodes(branches).filter(node => node.status !== 'completed')
}

/**
 * Check if a node is an ancestor of another
 */
export const isAncestor = (ancestorId: string, nodeId: string, branches: Branch[]): boolean => {
  let current = branches.find(b => b.id === nodeId)
  
  while (current) {
    if (current.parentId === ancestorId) return true
    if (current.parentIds?.includes(ancestorId)) return true
    current = current.parentId ? branches.find(b => b.id === current!.parentId) : undefined
  }
  
  return false
}

/**
 * Get the path from root to a specific node
 */
export const getNodePath = (nodeId: string, branches: Branch[]): string[] => {
  const path: string[] = []
  let current = branches.find(b => b.id === nodeId)
  
  while (current) {
    path.unshift(current.id)
    current = current.parentId ? branches.find(b => b.id === current!.parentId) : undefined
  }
  
  return path
}

/**
 * Calculate total token count for a node and its ancestors
 */
export const calculateTotalTokens = (nodeId: string, branches: Branch[]): number => {
  const node = branches.find(b => b.id === nodeId)
  if (!node) return 0
  
  const ancestors = getNodeAncestors(nodeId, branches)
  const allNodes = [...ancestors, node]
  
  return allNodes.reduce((total, n) => total + (n.tokenCount || 0), 0)
}