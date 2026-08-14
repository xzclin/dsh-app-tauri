/**
 * 会话与聊天状态（移植自 dsh-mobile）。
 */

import { create } from 'zustand'
import { ChatItem, foldEvent, sortBySeq } from '../api/fold'
import { ApprovalRequestedFrame, AskUserQuestionItem, HostFrame, LOCAL_DSH_URL, MuxFrame, SessionSummary } from '../api/types'
import { createSessionApi } from '../api/session-api'
import { respondCall } from '../api/rpc'

export interface PendingApproval {
  rpcId: string
  frame: ApprovalRequestedFrame
}

export interface PendingQuestion {
  rpcId: string
  sessionId: string
  questions: AskUserQuestionItem[]
}

interface ChatState {
  sessions: SessionSummary[]
  sessionsLoaded: boolean
  titles: Record<string, string>
  messages: Record<string, ChatItem[]>
  running: Record<string, boolean>
  approvals: Record<string, PendingApproval[]>
  questions: Record<string, PendingQuestion[]>
  lastSeq: Record<string, number>

  refreshSessions: () => Promise<void>
  openSession: (sessionId: string) => Promise<void>
  createSession: () => Promise<string | null>
  sendText: (sessionId: string, text: string, mode?: 'queue' | 'steer') => Promise<boolean>
  cancelTurn: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<void>
  respondApproval: (sessionId: string, rpcId: string, outcome: 'allowed-once' | 'rejected') => Promise<void>
  respondQuestion: (sessionId: string, rpcId: string, itemId: string, optionLabel?: string, custom?: string) => Promise<void>

  handleMux: (frame: MuxFrame, rpcId?: string) => void
  handleHost: (frame: HostFrame) => void
}

function api() {
  // dsh 固定运行在本机 loopback
  return createSessionApi(LOCAL_DSH_URL)
}

export const chatStore = create<ChatState>((set, get) => ({
  sessions: [],
  sessionsLoaded: false,
  titles: {},
  messages: {},
  running: {},
  approvals: {},
  questions: {},
  lastSeq: {},

  refreshSessions: async () => {
    const result = await api().list()
    if (result.ok) set({ sessions: result.value.items, sessionsLoaded: true })
  },

  openSession: async (sessionId) => {
    const result = await api().history(sessionId)
    if (!result.ok) return
    const items = sortBySeq(result.value.events.map((entry) => foldEvent([], entry.event)).flat())
    set((state) => ({
      messages: { ...state.messages, [sessionId]: items },
      lastSeq: { ...state.lastSeq, [sessionId]: items.length > 0 ? items[items.length - 1]!.seq : 0 },
    }))
  },

  createSession: async () => {
    const result = await api().create()
    if (!result.ok) return null
    await get().refreshSessions()
    return result.value.sessionId
  },

  sendText: async (sessionId, text, mode = 'queue') => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return false
    const result = await api().prompt(sessionId, trimmed, mode)
    if (!result.ok) return false
    return true
  },

  cancelTurn: async (sessionId) => {
    await api().cancel(sessionId)
  },

  renameSession: async (sessionId, title) => {
    const result = await api().rename(sessionId, title)
    if (result.ok) {
      set((state) => ({ titles: { ...state.titles, [sessionId]: result.value.title } }))
    }
  },

  respondApproval: async (sessionId, rpcId, outcome) => {
    const pending = get().approvals[sessionId] ?? []
    const item = pending.find((p) => p.rpcId === rpcId)
    if (!item) return
    await respondCall(LOCAL_DSH_URL, rpcId, {
      sessionId,
      approvalId: item.frame.approvalId,
      outcome,
    })
    set((state) => ({
      approvals: {
        ...state.approvals,
        [sessionId]: (state.approvals[sessionId] ?? []).filter((p) => p.rpcId !== rpcId),
      },
    }))
  },

  respondQuestion: async (sessionId, rpcId, itemId, optionLabel, custom) => {
    const pending = get().questions[sessionId] ?? []
    const item = pending.find((p) => p.rpcId === rpcId)
    if (!item) return
    await respondCall(LOCAL_DSH_URL, rpcId, {
      sessionId,
      answers: [{
        id: itemId,
        ...(optionLabel !== undefined ? { selected: [optionLabel] } : {}),
        ...(custom !== undefined && custom.length > 0 ? { custom } : {}),
      }],
    })
    set((state) => ({
      questions: {
        ...state.questions,
        [sessionId]: (state.questions[sessionId] ?? []).filter((p) => p.rpcId !== rpcId),
      },
    }))
  },

  handleMux: (frame, rpcId) => {
    // stream/error 帧没有 sessionId，只记录日志
    if (frame.type === 'stream/error') return
    const sessionId = frame.sessionId
    if (!sessionId) return
    switch (frame.type) {
      case 'session/event': {
        set((state) => {
          const items = foldEvent(state.messages[sessionId] ?? [], frame.event)
          return {
            messages: { ...state.messages, [sessionId]: items },
            lastSeq: { ...state.lastSeq, [sessionId]: frame.event.seq },
          }
        })
        break
      }
      case 'session/subscribed':
        set((state) => ({ lastSeq: { ...state.lastSeq, [sessionId]: frame.lastSeq } }))
        break
      case 'approval/requested': {
        const item: PendingApproval = {
          rpcId: rpcId ?? '',
          frame: {
            sessionId: frame.sessionId,
            approvalId: frame.approvalId,
            toolName: frame.toolName,
            callId: frame.callId,
            reason: frame.reason,
          },
        }
        set((state) => ({
          approvals: { ...state.approvals, [sessionId]: [...(state.approvals[sessionId] ?? []), item] },
        }))
        break
      }
      case 'approval/resolved':
        set((state) => ({
          approvals: {
            ...state.approvals,
            [sessionId]: (state.approvals[sessionId] ?? []).filter((p) => p.frame.approvalId !== frame.approvalId),
          },
        }))
        break
      case 'question/requested': {
        const item: PendingQuestion = { rpcId: rpcId ?? '', sessionId, questions: frame.questions }
        set((state) => ({
          questions: { ...state.questions, [sessionId]: [...(state.questions[sessionId] ?? []), item] },
        }))
        break
      }
      case 'question/resolved':
        set((state) => ({
          questions: { ...state.questions, [sessionId]: (state.questions[sessionId] ?? []).filter((q) => q.rpcId !== frame.questionRpcId) },
        }))
        break
      default:
        break
    }
  },

  handleHost: (frame) => {
    switch (frame.type) {
      case 'host/session-added':
      case 'host/session-removed':
        void get().refreshSessions()
        break
      case 'host/session-status':
        set((state) => ({ running: { ...state.running, [frame.sessionId]: frame.running } }))
        break
      case 'host/agent-error':
        set((state) => {
          const items = state.messages[frame.sessionId] ?? []
          return {
            messages: {
              ...state.messages,
              [frame.sessionId]: [...items, {
                kind: 'meta',
                id: `error-${Date.now()}`,
                seq: state.lastSeq[frame.sessionId] ?? 0,
                time: Date.now(),
                text: `Agent 出错：${frame.message}`,
              } satisfies ChatItem],
            },
          }
        })
        break
      default:
        break
    }
  },
}))
