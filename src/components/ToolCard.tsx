import React, { useState } from 'react'
import { ChatItem } from '../api/fold'
import { Theme } from '../theme'

interface ToolCardProps {
  item: Extract<ChatItem, { kind: 'tool' }>
  theme: Theme
}

/** 工具调用卡片：参数与结果可折叠。 */
export function ToolCard({ item, theme }: ToolCardProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const done = item.resultText !== undefined
  const ok = item.ok ?? true
  const statusColor = !done ? theme.textMuted : ok ? theme.success : theme.danger

  return (
    <div
      style={{
        margin: '4px 16px',
        background: theme.surfaceAlt,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setOpen((value) => !value)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
      >
        <span style={{ color: statusColor, fontSize: 13, width: 18, textAlign: 'center' }}>{!done ? '⏳' : ok ? '✓' : '✗'}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
        <span style={{ fontSize: 12, color: statusColor }}>{done ? '完成' : '运行中'}</span>
        <span style={{ fontSize: 12, color: theme.textMuted }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {item.argsRaw !== undefined && (
            <>
              <div style={{ fontSize: 11, color: theme.textMuted }}>参数</div>
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: theme.text, margin: 0 }}>{item.argsRaw}</pre>
            </>
          )}
          {item.resultText !== undefined && (
            <>
              <div style={{ fontSize: 11, color: theme.textMuted }}>结果</div>
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: ok ? theme.text : theme.danger, margin: 0 }}>{item.resultText}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
