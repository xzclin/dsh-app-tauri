import React from 'react'
import { Theme } from '../theme'
import { ConnectionStatus } from '../api/connection'

interface ConnectionBannerProps {
  status: ConnectionStatus
  detail?: string
  theme: Theme
}

/** 连接状态横幅（断线/重连时显示）。 */
export function ConnectionBanner({ status, detail, theme }: ConnectionBannerProps): React.JSX.Element | null {
  if (status === 'connected') return null
  const message = status === 'connecting'
    ? '正在连接服务器…'
    : status === 'error'
      ? `连接断开：${detail ?? '重试中'}`
      : '未连接服务器'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: status === 'connecting' ? theme.accentSoft : theme.warningSoft }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: status === 'connecting' ? theme.accent : theme.warning }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: status === 'connecting' ? theme.accent : theme.text }}>{message}</span>
    </div>
  )
}
