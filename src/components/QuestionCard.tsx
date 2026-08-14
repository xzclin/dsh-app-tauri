import React, { useState } from 'react'
import { PendingQuestion } from '../store/chat'
import { Theme } from '../theme'

interface QuestionCardProps {
  pending: PendingQuestion
  theme: Theme
  onAnswer: (itemId: string, optionLabel?: string, custom?: string) => void
  busy?: boolean
}

/** Agent 提问卡片：选项或文本回答。 */
export function QuestionCard({ pending, theme, onAnswer, busy }: QuestionCardProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const first = pending.questions[0]
  if (!first) return <></>

  const hasOptions = Array.isArray(first.options) && first.options.length > 0
  const canSubmit = hasOptions ? selected !== null : text.trim().length > 0

  const submit = (): void => {
    if (!canSubmit) return
    if (hasOptions && selected) onAnswer(first.id, selected)
    else onAnswer(first.id, undefined, text.trim())
  }

  return (
    <div style={{ margin: '6px 16px', background: theme.surface, border: `1px solid ${theme.accent}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent, letterSpacing: 0.5 }}>❓ Agent 提问</div>
      <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.45, color: theme.text }}>{first.question}</div>

      {hasOptions ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {first.options!.map((option) => (
            <div
              key={option.label}
              onClick={() => !busy && setSelected(option.label)}
              style={{
                borderRadius: 10,
                border: `1px solid ${selected === option.label ? theme.accent : theme.border}`,
                background: selected === option.label ? theme.accentSoft : 'transparent',
                padding: '10px 12px',
                fontSize: 14,
                color: theme.text,
                cursor: 'pointer',
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="输入回答…"
          rows={2}
          style={{
            marginTop: 10,
            width: '100%',
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.surfaceAlt,
            color: theme.text,
            padding: '10px 12px',
            fontSize: 14,
            resize: 'none',
          }}
        />
      )}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={submit} disabled={busy || !canSubmit}>
        {busy ? '提交中…' : '提交回答'}
      </button>
    </div>
  )
}
