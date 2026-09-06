'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId, Role } from './types'

interface UIState {
  role: Role
  activeModule: ModuleId
  setRole: (r: Role) => void
  setModule: (m: ModuleId) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      role: 'government',
      activeModule: 'dashboard',
      setRole: (r) => set({ role: r, activeModule: 'dashboard' }),
      setModule: (m) => set({ activeModule: m }),
    }),
    {
      name: 'skillpulse-ui',
      partialize: (s) => ({ role: s.role, activeModule: s.activeModule }),
    }
  )
)
