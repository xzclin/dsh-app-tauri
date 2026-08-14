import React from 'react'
import { useTheme } from './theme'
import { navigationStore } from './store/navigation'
import { connectionStore } from './store/connection'
import { StartupScreen } from './screens/StartupScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ChatScreen } from './screens/ChatScreen'

export default function App(): React.JSX.Element {
  const theme = useTheme()
  const screen = navigationStore((state) => state.screen)
  const status = connectionStore((state) => state.status)
  const dshReady = connectionStore((state) => state.dshReady)

  // dsh 就绪但还没进 home（比如从错误恢复重连）时自动进入
  React.useEffect(() => {
    if (dshReady && status === 'connected' && navigationStore.getState().screen === 'startup') {
      navigationStore.getState().go('home')
    }
  }, [dshReady, status])

  return (
    <div className="app-shell safe-top safe-bottom" style={{ background: theme.background }}>
      {screen === 'startup' && <StartupScreen />}
      {screen === 'home' && <HomeScreen />}
      {screen === 'chat' && <ChatScreen />}
    </div>
  )
}
