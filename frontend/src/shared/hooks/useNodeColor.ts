import { getNodeTypeColor } from '@shared/theme/colors'

export const useNodeColor = (type?: string) => {
  const color = getNodeTypeColor(type)
  
  return {
    color,
    backgroundColor: `${color}25`,
    borderColor: `${color}40`,
    lightBackground: `${color}15`,
    darkBackground: `${color}30`,
  }
}