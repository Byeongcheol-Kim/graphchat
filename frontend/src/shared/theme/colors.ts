// Node type colors - used across the application
export const nodeTypeColors = {
  main: '#6366f1',
  topic: '#8b5cf6',
  exploration: '#06b6d4',
  question: '#10b981',
  solution: '#f59e0b',
  merge: '#e91e63',
  default: '#64748b',
} as const

export type NodeType = keyof typeof nodeTypeColors

// Status colors
export const statusColors = {
  active: '#10b981',
  paused: '#f59e0b',
  completed: '#6366f1',
  default: '#94a3b8',
} as const

export type StatusType = keyof typeof statusColors

// Common UI colors
export const uiColors = {
  // Text colors
  textPrimary: '#1a1a1a',
  textSecondary: '#424242',
  textTertiary: '#616161',
  textMuted: '#9e9e9e',
  
  // Background colors
  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f8f9fa',
  backgroundTertiary: '#f1f3f5',
  backgroundPanel: '#f8f9fa',
  
  // Border colors
  borderLight: '#dee2e6',
  borderMedium: '#e5e7eb',
  borderDark: '#94a3b8',
} as const

// Get color for node type
export const getNodeTypeColor = (type?: string): string => {
  return nodeTypeColors[type as NodeType] || nodeTypeColors.default
}

// Get color for status
export const getStatusColor = (status?: string): string => {
  return statusColors[status as StatusType] || statusColors.default
}