/**
 * dsh-app 协议类型：与 DeepSeek Harness Host 的 wire 协议一一对应。
 * 移植自 dsh-mobile（协议与平台无关）。
 */

export type RpcId = string

/** RPC 成功/失败结果（业务错误永远以 ok:false 返回）。 */
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }

export interface RpcError {
  code: string
  message: string
  details: Record<string, unknown>
}

export interface ClientRequest {
  type: 'client-request'
  rpcId: RpcId
  method: string
  payload: unknown
}

export interface ServerResponse {
  type: 'server-response'
  rpcId: RpcId
  result: RpcResult<unknown>
}

export interface ServerRequest {
  type: 'server-request'
  rpcId: RpcId
  method: string
  payload: unknown
}

export interface ClientResponse {
  type: 'client-response'
  rpcId: RpcId
  result: RpcResult<unknown>
}

export type RpcReceipt = { accepted: true } | { accepted: false; reason: 'not-pending' | 'bad-response' }

export interface SessionSummary {
  sessionId: string
  updatedAt: number
  running: boolean
  blank: boolean
  parentSessionId?: string
  cwd?: string
  agentPreset?: string
  projections?: Record<string, unknown>
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'image'; attachment: { id: string; mediaType: string } }
  | { type: 'tool-call'; id: string; name: string; arguments: string }
  | { type: string; [key: string]: unknown }

export interface SessionEventBase {
  seq: number
  time: number
}

export type SessionEvent =
  | (SessionEventBase & { type: 'user/message'; data: { id: string; content: ContentBlock[]; source?: { kind: string; rpcId?: string } } })
  | (SessionEventBase & { type: 'assistant/message'; data: { id: string; content: ContentBlock[]; source?: { kind: string }; error?: string } })
  | (SessionEventBase & { type: 'turn/start'; data: Record<string, unknown> })
  | (SessionEventBase & { type: 'turn/end'; data: Record<string, unknown> })
  | (SessionEventBase & { type: 'tool/call'; data: { callId: string; name: string; args?: string } })
  | (SessionEventBase & { type: 'tool/result'; data: { callId: string; ok?: boolean; result?: unknown; error?: string } })
  | (SessionEventBase & { type: 'session/title'; data: { title: string; source?: unknown } })
  | (SessionEventBase & { type: 'compaction/summary'; data: Record<string, unknown> })

export type MuxFrame =
  | { type: 'session/event'; sessionId: string; event: SessionEvent; view?: unknown }
  | { type: 'session/subscribed'; sessionId: string; lastSeq: number }
  | { type: 'approval/requested'; sessionId: string; approvalId: string; toolName: string; callId?: string; reason?: string }
  | { type: 'approval/resolved'; sessionId: string; approvalId: string; outcome: string }
  | { type: 'question/requested'; sessionId: string; questions: AskUserQuestionItem[] }
  | { type: 'question/resolved'; sessionId: string; questionRpcId: string; outcome: string }
  | { type: 'session/queue'; sessionId: string; items: unknown[] }
  | { type: 'session/jobs'; sessionId: string; jobs: unknown[] }
  | { type: 'session/projection'; sessionId: string; key: string; value: unknown; seq: number }
  | { type: 'stream/error'; error: RpcError }

export interface AskUserQuestionOption {
  label: string
  description?: string
}

export interface ApprovalRequestedFrame {
  sessionId: string
  approvalId: string
  toolName: string
  callId?: string
  reason?: string
}

export interface AskUserQuestionItem {
  id: string
  question: string
  detail?: string
  header?: string
  options?: AskUserQuestionOption[]
  multiSelect?: boolean
  intent?: unknown
  [key: string]: unknown
}

export type HostFrame =
  | { type: 'host/session-added'; sessionId: string; blank: boolean; parentSessionId?: string; cwd?: string; agentPreset?: string }
  | { type: 'host/session-removed'; sessionId: string }
  | { type: 'host/session-status'; sessionId: string; running: boolean }
  | { type: 'host/agent-error'; sessionId: string; message: string }
  | { type: 'host/workspace-changed' | 'host/workspace-removed' | 'host/workspace-order-changed' | 'host/archived-sessions-changed'; [key: string]: unknown }
  | { type: 'host/remote-event'; event: string; args: unknown[] }
  | { type: 'stream/error'; error: RpcError }

export interface HostDescription {
  version: string
  cwd: string
  provider?: string
  model?: string
  attachedSessions: number
  canOpenPath: boolean
}

/** 本地 dsh 固定地址（dsh 只监听 loopback）。 */
export const LOCAL_DSH_URL = 'http://127.0.0.1:3080'

export function makeRpcId(): string {
  const c = (): string => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `${c()}${c()}-${c()}-${c()}-${c()}-${c()}${c()}${c()}`
}
