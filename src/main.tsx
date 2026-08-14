import React from 'react'
import { createRoot } from 'react-dom/client'
import { listen } from '@tauri-apps/api/event'
import App from './App'
import { applyThemeVariables, useTheme } from './theme'
import { connectionStore } from './store/connection'
import { navigationStore } from './store/navigation'

// 初始化主题变量
const theme = useTheme()
applyThemeVariables(theme)

// Rust 探测事件：dsh 就绪 → 前端开始协议层连接；失败 → 显示错误页
listen<string>('dsh-ready', () => {
  connectionStore.getState().onDshReady()
  navigationStore.getState().go('home')
}).catch(() => undefined)

listen<string>('dsh-error', (event) => {
  connectionStore.setState({ status: 'error', detail: String(event.payload) })
}).catch(() => undefined)

const root = document.getElementById('root')
if (root === null) throw new Error('missing #root')
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
