import { create } from 'zustand'
import { HistoryState } from '@/types'

interface HistoryStoreState {
  history: HistoryState[]
  historyIndex: number
  
  saveToHistory: (state: HistoryState) => void
  undo: (applyState: (state: HistoryState) => void) => void
  redo: (applyState: (state: HistoryState) => void) => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  history: [],
  historyIndex: -1,
  
  saveToHistory: (state) => {
    set((current) => {
      // 현재 인덱스 이후의 히스토리 제거 (새로운 브랜치 생성)
      const newHistory = current.history.slice(0, current.historyIndex + 1)
      newHistory.push(state)
      
      // 히스토리 크기 제한 (최대 50개)
      if (newHistory.length > 50) {
        newHistory.shift()
        return {
          history: newHistory,
          historyIndex: newHistory.length - 1,
        }
      }
      
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },
  
  undo: (applyState) => {
    const state = get()
    if (state.historyIndex > 0) {
      const previousState = state.history[state.historyIndex - 1]
      applyState(previousState)
      set({ historyIndex: state.historyIndex - 1 })
    }
  },
  
  redo: (applyState) => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1]
      applyState(nextState)
      set({ historyIndex: state.historyIndex + 1 })
    }
  },
  
  canUndo: () => {
    const state = get()
    return state.historyIndex > 0
  },
  
  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },
  
  clearHistory: () => {
    set({ history: [], historyIndex: -1 })
  },
}))