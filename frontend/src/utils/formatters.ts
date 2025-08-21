/**
 * Format token count with K suffix for thousands
 */
export const formatTokenCount = (count?: number): string => {
  if (!count) return '0'
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}k`
}

/**
 * Format timestamp to localized time string
 */
export const formatTime = (date: Date, includeSeconds = false): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  }
  return date.toLocaleTimeString('ko-KR', options)
}

/**
 * Format file size to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Generate unique ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}