import React, { useEffect } from 'react'
import { useTheme } from '../theme'
import { chatStore } from '../store/chat'
import { connectionStore } from '../store/connection'
import { navigationStore } from '../store/navigation'
import { SessionSummary } from '../api/types'

function formatRelative(updatedAt: number): string {
  const diff = Date.now() - updatedAt
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const date = new Date(updatedAt)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** 会话列表页。 */
export function HomeScreen(): React.JSX.Element {
  const theme = useTheme()
  const { sessions, sessionsLoaded, refreshSessions, openSession, createSession } = chatStore()
  const { status, host } = connectionStore()
  const go = navigationStore((state) => state.go)

  useEffect(() => {
    void refreshSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpen = (sessionId: string): void => {
    void openSession(sessionId)
    go('chat', sessionId)
  }

  const handleCreate = async (): Promise<void> => {
    const sessionId = await createSession()
    if (sessionId !== null) {
      void openSession(sessionId)
      go('chat', sessionId)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 顶栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: `1px solid ${theme.border}`,
          background: theme.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: status === 'connected' ? theme.success : theme.warning }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.text }}>会话</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {host && <span style={{ fontSize: 12, color: theme.textMuted }}>dsh v{host.version}</span>}
          <button
            className="btn btn-ghost"
            style={{ padding: '8px 12px', fontSize: 13 }}
            onClick={() => navigationStore.getState().go('startup')}
          >
            状态
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 96 }}>
        {!sessionsLoaded && sessions.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 80, color: theme.textMuted, fontSize: 14 }}>加载中…</div>
        )}

        {sessions.length === 0 && sessionsLoaded && (
          <div style={{ textAlign: 'center', marginTop: 100, color: theme.textMuted }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🐋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>还没有会话</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>点击右下角 + 开始新的对话</div>
          </div>
        )}

        {sessions.map((item: SessionSummary) => (
          <div
            key={item.sessionId}
            onClick={() => handleOpen(item.sessionId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: theme.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              💬
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.cwd ? item.cwd.split(/[\\/]/).pop() : `会话 ${item.sessionId.slice(0, 8)}`}
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.cwd ?? '默认工作目录'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {item.running && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: theme.accentSoft, color: theme.accent, borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.accent }} />
                  运行中
                </span>
              )}
              <span style={{ fontSize: 11, color: theme.textMuted }}>{formatRelative(item.updatedAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 新建会话 FAB */}
      <button
        onClick={() => void handleCreate()}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          width: 56,
          height: 56,
          borderRadius: 28,
          border: 'none',
          background: theme.accent,
          color: '#fff',
          fontSize: 26,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(77,107,254,0.4)',
        }}
      >
        ＋
      </button>
    </div>
  )
}
