import React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useTheme } from '../theme'
import { connectionStore } from '../store/connection'
import { navigationStore } from '../store/navigation'

/** 启动状态页：等待本地 dsh 就绪 / 显示连接错误与重试。 */
export function StartupScreen(): React.JSX.Element {
  const theme = useTheme()
  const { status, detail, connect, dshReady } = connectionStore()
  const go = navigationStore((state) => state.go)

  React.useEffect(() => {
    if (status === 'connected') go('home')
  }, [status, go])

  // 兜底查询：dsh-ready 事件可能早于页面加载发出而丢失，
  // 这里主动轮询 Rust 的就绪状态（最多 60 秒）。
  React.useEffect(() => {
    if (dshReady) return
    let cancelled = false
    let attempts = 0
    const timer = setInterval(() => {
      if (cancelled || dshReady) return
      attempts += 1
      void invoke<boolean>('check_dsh_ready').then((ready) => {
        if (ready && !cancelled) {
          clearInterval(timer)
          connectionStore.getState().onDshReady()
          navigationStore.getState().go('home')
        } else if (attempts >= 30) {
          clearInterval(timer)
          connectionStore.setState({ status: 'error', detail: '本地 dsh 服务未就绪，请检查后重试' })
        }
      }).catch(() => undefined)
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [dshReady])

  const failed = status === 'error'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: theme.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 26,
          color: '#fff',
          letterSpacing: 1,
          boxShadow: '0 8px 32px rgba(77,107,254,0.35)',
        }}
      >
        dsh
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>DeepSeek Harness</h1>

      {failed ? (
        <>
          <div style={{ color: theme.danger, fontSize: 13, textAlign: 'center', lineHeight: 1.7, maxWidth: 280 }}>
            {detail ?? '本地 dsh 服务未就绪'}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { connectionStore.getState().reset(); connect() }}
          >
            重新连接
          </button>
        </>
      ) : (
        <>
          <div className="spinner" />
          <div style={{ color: theme.textMuted, fontSize: 13 }}>
            {dshReady ? '正在连接本地服务…' : '正在启动本地服务…'}
          </div>
        </>
      )}
    </div>
  )
}
