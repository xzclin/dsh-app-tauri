import React from 'react'
import { Theme } from '../theme'

interface RichTextProps {
  text: string
  theme: Theme
}

function splitCodeBlocks(text: string): { kind: 'code' | 'text'; content: string }[] {
  const parts: { kind: 'code' | 'text'; content: string }[] = []
  const regex = /```([\s\S]*?)```/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ kind: 'text', content: text.slice(last, match.index) })
    parts.push({ kind: 'code', content: match[1].replace(/^\w+\n/, '') })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', content: text.slice(last) })
  return parts
}

function renderInline(text: string, theme: Theme, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(<React.Fragment key={`${keyPrefix}-t${key++}`}>{text.slice(last, match.index)}</React.Fragment>)
    const token = match[1]
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${key++}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c${key++}`}
          style={{ color: theme.accent, background: theme.codeBackground, padding: '1px 4px', borderRadius: 4, fontSize: 13 }}
        >
          {token.slice(1, -1)}
        </code>,
      )
    }
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(<React.Fragment key={`${keyPrefix}-t${key++}`}>{text.slice(last)}</React.Fragment>)
  return nodes
}

/** 轻量 markdown 渲染（粗体/行内代码/代码块）。 */
export function RichText({ text, theme }: RichTextProps): React.JSX.Element {
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word', userSelect: 'text' }}>
      {splitCodeBlocks(text).map((part, index) =>
        part.kind === 'code' ? (
          <pre
            key={`block-${index}`}
            style={{
              background: theme.codeBackground,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: 10,
              margin: '6px 0',
              fontSize: 12.5,
              lineHeight: 1.5,
              overflowX: 'auto',
              userSelect: 'text',
            }}
          >
            {part.content}
          </pre>
        ) : (
          <span key={`block-${index}`}>{renderInline(part.content, theme, `b${index}`)}</span>
        ),
      )}
    </div>
  )
}
