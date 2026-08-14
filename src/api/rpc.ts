/**
 * HTTP RPC 载体：POST /api/<method>。
 * 经 Rust command 转发（reqwest 原生请求，无 Origin 头），绕开
 * tauri-plugin-http 自动附加 Origin 导致的 403 与 CORS 问题。
 */

import { invoke } from '@tauri-apps/api/core'
import { RpcReceipt, RpcResult, ServerResponse, makeRpcId } from './types'

/** 一次 unary RPC 调用。业务错误以 {ok:false} 返回，不抛异常。 */
export async function rpcCall<T>(
  _baseUrl: string,
  method: string,
  payload: unknown,
  _signal?: AbortSignal,
): Promise<RpcResult<T>> {
  try {
    const envelope = await invoke<ServerResponse>('dsh_rpc', {
      rpcId: makeRpcId(),
      method,
      payload,
    })
    if (envelope.type !== 'server-response') {
      return { ok: false, error: { code: 'bad-response', message: '响应缺少 server-response 信封', details: {} } }
    }
    return envelope.result as RpcResult<T>
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: { code: 'transport', message, details: {} } }
  }
}

/** 应答服务端推送（审批/提问）：POST /api/respond，rpcId 回显。 */
export async function respondCall(
  _baseUrl: string,
  rpcId: string,
  value: unknown,
  _signal?: AbortSignal,
): Promise<RpcReceipt | { accepted: false; reason: 'network' | 'bad-response'; message?: string }> {
  try {
    return await invoke<RpcReceipt>('dsh_respond', { rpcId, value })
  } catch (error) {
    return {
      accepted: false,
      reason: 'network',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
