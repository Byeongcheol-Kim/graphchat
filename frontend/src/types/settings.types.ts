export type ColorTheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'monochrome' | 'calm' | 'autumn' | 'pastel'
export type FontSize = 'small' | 'medium' | 'large'
export type AIModel = 'gpt-4' | 'gpt-3.5' | 'claude-3' | 'gemini-pro' | 'llama-2'

export interface Settings {
  darkMode: boolean
  fontSize: FontSize
  aiModel: AIModel
  colorTheme: ColorTheme
}