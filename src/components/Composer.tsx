import React, { useState } from 'react'
import { Theme } from '../theme'

interface ComposerProps {
  theme: Theme
  running: boolean
  onSend: (text: string) => void
  onStop: () => void
}

/** 底部输入栏：发送 / 停止，随键盘避让。 */
export function Composer({ theme, running, onSend, onStop }: ComposerProps): React.JSX.Element {
  const [text, setText] = useState('')
  const canSend = text.trim().length > 0

  const handleSend = (): void => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '8px 12px 10px',
        borderTop: `1px solid ${theme.border}`,
        background: theme.surface,
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Enter 发送，Shift+Enter 换行
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSend()
          }
        }}
        placeholder={running ? 'Agent 正在回复…（可发送排队消息）' : '发消息给 Agent…'}
        rows={1}
        maxLength={8000}
        style={{
          flex: 1,
          maxHeight: 120,
          borderRadius: 20,
          background: theme.surfaceAlt,
          border: 'none',
          color: theme.text,
          padding: '10px 14px',
          fontSize: 15,
          lineHeight: 1.4,
          resize: 'none',
          outline: 'none',
        }}
      />
      {running ? (
        <button
          onClick={onStop}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            border: 'none',
            background: theme.danger,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ■
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            border: 'none',
            background: canSend ? theme.accent : theme.surfaceAlt,
            color: canSend ? '#fff' : theme.textMuted,
            fontSize: 19,
            fontWeight: 700,
            cursor: canSend ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      )}
    </div>
  )
}
