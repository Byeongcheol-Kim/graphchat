import { useConversationStore } from '@store/conversationStore'
import { getNodeTypeColor as getColor, ColorTheme } from '@shared/theme/colors'

export const useThemeColor = () => {
  const { settings } = useConversationStore()
  
  const getNodeTypeColor = (type?: string): string => {
    return getColor(type, settings.colorTheme as ColorTheme)
  }
  
  return { getNodeTypeColor, colorTheme: settings.colorTheme }
}