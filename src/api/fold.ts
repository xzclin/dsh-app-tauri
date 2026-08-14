/**
 * 事件折叠：把 SessionEvent 流折叠成 UI 消息列表（移植自 dsh-mobile）。
 */

import { ContentBlock, SessionEvent } from './types'

export type ChatItem =
  | { kind: 'user'; id: string; seq: number; time: number; text: string }
  | { kind: 'assistant'; id: string; seq: number; time: number; text: string; reasoning?: string; error?: string; pending?: boolean }
  | { kind: 'tool'; callId: string; seq: number; time: number; name: string; argsRaw?: string; resultText?: string; ok?: boolean }
  | { kind: 'title'; seq: number; time: number; title: string }
  | { kind: 'meta'; id: string; seq: number; time: number; text: string }

function blocksToText(content: ContentBlock[] | undefined): { text: string; reasoning: string } {
  let text = ''
  let reasoning = ''
  for (const block of content ?? []) {
    if (block.type === 'text' && typeof block.text === 'string') text += block.text
    else if (block.type === 'reasoning' && typeof block.text === 'string') reasoning += block.text
  }
  return { text, reasoning }
}

export function foldEvent(items: ChatItem[], event: SessionEvent): ChatItem[] {
  switch (event.type) {
    case 'user/message': {
      const { text } = blocksToText(event.data.content)
      const item: ChatItem = { kind: 'user', id: event.data.id ?? `user-${event.seq}`, seq: event.seq, time: event.time, text }
      return upsertById(items, item)
    }
    case 'assistant/message': {
      const { text, reasoning } = blocksToText(event.data.content)
      const item: ChatItem = {
        kind: 'assistant',
        id: event.data.id ?? `assistant-${event.seq}`,
        seq: event.seq,
        time: event.time,
        text,
        ...(reasoning ? { reasoning } : {}),
        ...(event.data.error ? { error: event.data.error } : {}),
      }
      return upsertById(items, item)
    }
    case 'tool/call': {
      const item: ChatItem = {
        kind: 'tool',
        callId: event.data.callId ?? `call-${event.seq}`,
        seq: event.seq,
        time: event.time,
        name: event.data.name ?? 'tool',
        argsRaw: event.data.args,
      }
      return upsertTool(items, item)
    }
    case 'tool/result': {
      const callId = event.data.callId
      if (!callId) return items
      const resultText = summarizeResult(event.data.result)
      const next = items.map((item) => (
        item.kind === 'tool' && item.callId === callId
          ? { ...item, resultText, ok: event.data.ok ?? true, ...(event.data.error ? { resultText: event.data.error } : {}) }
          : item
      ))
      if (!next.some((item) => item.kind === 'tool' && item.callId === callId)) {
        return [...items, {
          kind: 'tool',
          callId,
          seq: event.seq,
          time: event.time,
          name: 'tool',
          resultText,
          ok: event.data.ok ?? true,
        } satisfies ChatItem]
      }
      return next
    }
    case 'session/title':
      return [...items, { kind: 'title', seq: event.seq, time: event.time, title: event.data.title ?? '' } satisfies ChatItem]
    case 'turn/start':
    case 'turn/end':
      return items
    case 'compaction/summary':
      return [...items, {
        kind: 'meta',
        id: `meta-${event.seq}`,
        seq: event.seq,
        time: event.time,
        text: '上下文已压缩',
      } satisfies ChatItem]
    default:
      return items
  }
}

function upsertById(items: ChatItem[], item: Extract<ChatItem, { id: string }>): ChatItem[] {
  const index = items.findIndex((existing) => 'id' in existing && existing.id === item.id)
  if (index === -1) return [...items, item]
  const next = [...items]
  next[index] = item
  return next
}

function upsertTool(items: ChatItem[], item: Extract<ChatItem, { kind: 'tool' }>): ChatItem[] {
  const index = items.findIndex((existing) => existing.kind === 'tool' && existing.callId === item.callId)
  if (index === -1) return [...items, item]
  const next = [...items]
  next[index] = { ...next[index] as Extract<ChatItem, { kind: 'tool' }>, ...item }
  return next
}

function summarizeResult(result: unknown): string | undefined {
  if (result === undefined || result === null) return undefined
  if (typeof result === 'string') return result.length > 800 ? `${result.slice(0, 800)}…` : result
  const json = JSON.stringify(result)
  return json === undefined ? undefined : (json.length > 800 ? `${json.slice(0, 800)}…` : json)
}

export function sortBySeq(items: ChatItem[]): ChatItem[] {
  return [...items].sort((a, b) => a.seq - b.seq)
}
