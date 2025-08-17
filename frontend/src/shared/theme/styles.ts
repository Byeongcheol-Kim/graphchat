// Shared style constants
export const borderRadius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '50%',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

export const fontSize = {
  xs: '10px',
  sm: '11px',
  md: '12px',
  lg: '14px',
  xl: '16px',
  xxl: '18px',
} as const

export const shadows = {
  sm: '0 2px 10px rgba(0,0,0,0.08)',
  md: '0 4px 20px rgba(0,0,0,0.1)',
  lg: '0 10px 40px rgba(0,0,0,0.2)',
} as const

// Common component styles
export const panelStyles = {
  borderRadius: borderRadius.lg,
  backgroundColor: '#f8f9fa',
  border: '1px solid #dee2e6',
  padding: spacing.lg,
} as const

export const chipStyles = {
  borderRadius: borderRadius.md,
  fontSize: fontSize.md,
  fontWeight: 500,
} as const

export const buttonStyles = {
  borderRadius: borderRadius.xl,
  textTransform: 'none' as const,
  fontSize: fontSize.md,
} as const

export const messageStyles = {
  borderRadius: {
    user: '18px 18px 4px 18px',
    assistant: '18px 18px 18px 4px',
  },
} as const