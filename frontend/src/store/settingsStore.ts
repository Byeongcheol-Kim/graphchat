import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Settings } from '@/types'

interface SettingsState {
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        darkMode: false,
        fontSize: 'medium',
        aiModel: 'gpt-4',
        colorTheme: 'default',
      },
      
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }))
      },
    }),
    {
      name: 'graphchat-settings',
    }
  )
)