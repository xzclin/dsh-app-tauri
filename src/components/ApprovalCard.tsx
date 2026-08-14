import React from 'react'
import { PendingApproval } from '../store/chat'
import { Theme } from '../theme'

interface ApprovalCardProps {
  approval: PendingApproval
  theme: Theme
  onRespond: (outcome: 'allowed-once' | 'rejected') => void
  busy?: boolean
}

/** 工具审批卡片：允许一次 / 拒绝。 */
export function ApprovalCard({ approval, theme, onRespond, busy }: ApprovalCardProps): React.JSX.Element {
  const { frame } = approval
  return (
    <div
      style={{
        margin: '6px 16px',
        background: theme.warningSoft,
        border: `1px solid ${theme.warning}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: theme.warning, color: '#1A1A1A', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
          需要授权
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {frame.toolName}
        </span>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: theme.textMuted }}>
        {frame.reason ?? 'Agent 请求执行此操作，请确认是否允许。'}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          className="btn"
          style={{ flex: 1, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.danger }}
          onClick={() => onRespond('rejected')}
          disabled={busy}
        >
          拒绝
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onRespond('allowed-once')} disabled={busy}>
          {busy ? '处理中…' : '允许一次'}
        </button>
      </div>
    </div>
  )
}
