/**
 * 极简屏幕路由：startup（等待本地 dsh 就绪）→ home（会话列表）→ chat。
 */

import { create } from 'zustand'

export type Screen = 'startup' | 'home' | 'chat'

interface NavigationState {
  screen: Screen
  activeSessionId: string | null
  go: (screen: Screen, sessionId?: string) => void
}

export const navigationStore = create<NavigationState>((set) => ({
  screen: 'startup',
  activeSessionId: null,
  go: (screen, sessionId) => set({
    screen,
    ...(sessionId !== undefined ? { activeSessionId: sessionId } : {}),
  }),
}))
