import React, { useState } from 'react'
import { ChatItem } from '../api/fold'
import { Theme } from '../theme'
import { RichText } from './RichText'
import { ToolCard } from './ToolCard'

interface ChatBubbleProps {
  item: ChatItem
  theme: Theme
}

function formatTime(time: number): string {
  const date = new Date(time)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 消息气泡 + 工具卡片 + 标题/元信息行。 */
export function ChatBubble({ item, theme }: ChatBubbleProps): React.JSX.Element {
  // 工具卡片
  if (item.kind === 'tool') {
    return <ToolCard item={item} theme={theme} />
  }

  // 标题分隔行
  if (item.kind === 'title') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px' }}>
        <div style={{ flex: 1, height: 1, background: theme.border }} />
        <span style={{ fontSize: 12, color: theme.textMuted }}>📌 {item.title}</span>
        <div style={{ flex: 1, height: 1, background: theme.border }} />
      </div>
    )
  }

  // 元信息（错误/压缩提示）
  if (item.kind === 'meta') {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{ fontSize: 12, color: theme.textMuted, opacity: 0.85 }}>{item.text}</span>
      </div>
    )
  }

  const isUser = item.kind === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding: '4px 16px' }}>
      <div
        style={{
          maxWidth: '86%',
          borderRadius: 18,
          padding: '10px 14px',
          background: isUser ? theme.userBubble : theme.assistantBubble,
          color: isUser ? theme.userBubbleText : theme.text,
          border: isUser ? 'none' : `1px solid ${theme.border}`,
          borderBottomRightRadius: isUser ? 6 : 18,
          borderBottomLeftRadius: isUser ? 18 : 6,
        }}
      >
        {!isUser && item.kind === 'assistant' && item.reasoning && (
          <ReasoningBlock text={item.reasoning} theme={theme} />
        )}
        {item.kind === 'assistant' && item.error ? (
          <div style={{ color: theme.danger, fontSize: 14 }}>⚠️ {item.error}</div>
        ) : (
          <RichText text={item.text || (isUser ? '' : '…')} theme={theme} />
        )}
        {!isUser && (
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7, textAlign: 'right', color: theme.textMuted }}>
            {formatTime(item.time)}
          </div>
        )}
      </div>
    </div>
  )
}

function ReasoningBlock({ text, theme }: { text: string; theme: Theme }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: theme.accentSoft, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
      <span
        onClick={() => setOpen((value) => !value)}
        style={{ color: theme.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        {open ? '▾ 收起思考过程' : '▸ 查看思考过程'}
      </span>
      {open && <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: theme.textMuted, whiteSpace: 'pre-wrap' }}>{text}</div>}
    </div>
  )
}
