/**
 * 会话域 API 封装（endpoint: session.*），复用本地 dsh 地址。
 */

import { HostDescription, RpcResult, SessionSummary } from './types'
import { rpcCall } from './rpc'

export interface DshSessionApi {
  describe(): Promise<RpcResult<HostDescription>>
  list(): Promise<RpcResult<{ items: SessionSummary[] }>>
  create(): Promise<RpcResult<{ sessionId: string; agentPreset?: string }>>
  history(sessionId: string, beforeSeq?: number): Promise<RpcResult<{
    events: { event: import('./types').SessionEvent; view?: unknown }[]
    hasMore: boolean
  }>>
  prompt(sessionId: string, text: string, mode: 'queue' | 'steer'): Promise<RpcResult<{ accepted: true; command?: { kind: string; text?: string } }>>
  cancel(sessionId: string): Promise<RpcResult<{ accepted: true }>>
  rename(sessionId: string, title: string): Promise<RpcResult<{ title: string; seq: number }>>
}

export function createSessionApi(baseUrl: string): DshSessionApi {
  const call = <T>(method: string, payload: unknown): Promise<RpcResult<T>> =>
    rpcCall<T>(baseUrl, method, payload)

  return {
    describe: () => call('host.describe', {}),
    list: () => call('session.list', {}),
    create: () => call('session.create', {}),
    history: (sessionId, beforeSeq) =>
      call('session.history', { sessionId, ...(beforeSeq !== undefined ? { beforeSeq } : {}) }),
    prompt: (sessionId, text, mode) =>
      call('session.prompt', {
        sessionId,
        mode,
        content: [{ type: 'text', text }],
        ...(Intl.DateTimeFormat().resolvedOptions().timeZone
          ? { clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
          : {}),
      }),
    cancel: (sessionId) => call('session.cancel', { sessionId }),
    rename: (sessionId, title) => call('session.rename', { sessionId, title }),
  }
}
