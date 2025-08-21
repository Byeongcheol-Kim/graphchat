import { useThemeColor } from './useThemeColor'

export const useNodeColor = (type?: string) => {
  const { getNodeTypeColor } = useThemeColor()
  const color = getNodeTypeColor(type)
  
  return {
    color,
    backgroundColor: `${color}25`,
    borderColor: `${color}40`,
    lightBackground: `${color}15`,
    darkBackground: `${color}30`,
  }
}