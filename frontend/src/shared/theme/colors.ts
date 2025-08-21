// Color theme palettes
export const colorThemes = {
  default: {
    root: '#64748b',
    main: '#6366f1',
    topic: '#8b5cf6',
    exploration: '#06b6d4',
    question: '#10b981',
    solution: '#f59e0b',
    summary: '#e91e63',
    reference: '#9333ea',
    default: '#64748b',
  },
  ocean: {
    root: '#64748b',
    main: '#0284c7',
    topic: '#0891b2',
    exploration: '#0e7490',
    question: '#0d9488',
    solution: '#14b8a6',
    summary: '#06b6d4',
    reference: '#0ea5e9',
    default: '#64748b',
  },
  forest: {
    root: '#64748b',
    main: '#059669',
    topic: '#10b981',
    exploration: '#14b8a6',
    question: '#06b6d4',
    solution: '#0891b2',
    summary: '#0e7490',
    reference: '#047857',
    default: '#64748b',
  },
  sunset: {
    root: '#64748b',
    main: '#dc2626',
    topic: '#ea580c',
    exploration: '#f97316',
    question: '#fb923c',
    solution: '#fbbf24',
    summary: '#facc15',
    reference: '#f59e0b',
    default: '#64748b',
  },
  monochrome: {
    root: '#e5e7eb',
    main: '#1f2937',
    topic: '#374151',
    exploration: '#4b5563',
    question: '#6b7280',
    solution: '#9ca3af',
    summary: '#d1d5db',
    reference: '#f3f4f6',
    default: '#64748b',
  },
  calm: {
    root: '#64748b',
    main: '#5b7c99',
    topic: '#7c92a8',
    exploration: '#8fa3b3',
    question: '#a6b7c4',
    solution: '#b8c6d1',
    summary: '#cdd7df',
    reference: '#e2e8ee',
    default: '#64748b',
  },
  autumn: {
    root: '#64748b',
    main: '#a8312f',
    topic: '#c05621',
    exploration: '#d97706',
    question: '#ca8a04',
    solution: '#a16207',
    summary: '#854d0e',
    reference: '#713f12',
    default: '#64748b',
  },
  pastel: {
    root: '#94a3b8',
    main: '#c084fc',
    topic: '#f0abfc',
    exploration: '#fbbf24',
    question: '#86efac',
    solution: '#67e8f9',
    summary: '#fda4af',
    reference: '#ddd6fe',
    default: '#94a3b8',
  },
} as const

export type ColorTheme = keyof typeof colorThemes
export type NodeType = keyof typeof colorThemes.default

// Node type colors - used across the application
export const nodeTypeColors = colorThemes.default

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

// Get color for node type with theme support
export const getNodeTypeColor = (type?: string, theme: ColorTheme = 'default'): string => {
  const themeColors = colorThemes[theme] || colorThemes.default
  return themeColors[type as NodeType] || themeColors.default
}

// Get color for status
export const getStatusColor = (status?: string): string => {
  return statusColors[status as StatusType] || statusColors.default
}