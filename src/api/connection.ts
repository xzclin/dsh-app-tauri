/**
 * 连接管理器（Web 版）：两条只读 WebSocket 下行流 + host.describe 握手。
 * 经 tauri-plugin-websocket 连接（原生客户端，无浏览器 Origin 限制）。
 * 任一流失败 → 整代重连（指数退避 500ms×2，上限 10s）。
 */

import Websocket from '@tauri-apps/plugin-websocket'
import { HostDescription, HostFrame, MuxFrame, ServerRequest } from './types'
import { rpcCall } from './rpc'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ConnectionCallbacks {
  onStatusChange: (status: ConnectionStatus, detail?: string) => void
  /** 第二个参数是 ServerRequest 信封的 rpcId（审批/提问应答需回显）。 */
  onMux: (frame: MuxFrame, rpcId?: string) => void
  onHost: (frame: HostFrame) => void
  onConnected: (description: HostDescription) => void
}

export class DshConnection {
  private status: ConnectionStatus = 'idle'
  private generation = 0
  private mux: Websocket | null = null
  private host: Websocket | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false

  constructor(
    private readonly baseUrl: string,
    private readonly callbacks: ConnectionCallbacks,
  ) {}

  start(): void {
    this.stopped = false
    this.generation += 1
    void this.connectOnce(this.generation)
  }

  stop(): void {
    this.stopped = true
    this.generation += 1
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    void this.closeSockets()
    this.setStatus('idle')
  }

  private async closeSockets(): Promise<void> {
    const { mux, host } = this
    this.mux = null
    this.host = null
    if (mux) await mux.disconnect().catch(() => undefined)
    if (host) await host.disconnect().catch(() => undefined)
  }

  private async connectOnce(gen: number): Promise<void> {
    if (this.stopped || gen !== this.generation) return
    this.setStatus('connecting')

    const wsBase = this.baseUrl.replace(/^http/, 'ws')
    const muxUrl = `${wsBase}/api/events.mux`
    const hostUrl = `${wsBase}/api/events.host`

    let muxOpen = false
    let hostOpen = false
    let describeDone = false
    let failed = false

    const fail = (detail: string): void => {
      if (failed || this.stopped || gen !== this.generation) return
      failed = true
      void this.closeSockets()
      this.scheduleRetry(detail)
    }

    const maybeReady = async (): Promise<void> => {
      if (failed || !muxOpen || !hostOpen || describeDone) return
      describeDone = true
      const result = await rpcCall<HostDescription>(this.baseUrl, 'host.describe', {})
      if (failed || this.stopped || gen !== this.generation) return
      if (!result.ok) {
        fail(`握手失败：${result.error.message}`)
        return
      }
      this.setStatus('connected')
      this.callbacks.onConnected(result.value)
    }

    // ---- mux 流 ----
    try {
      this.mux = await Websocket.connect(muxUrl)
      if (this.stopped || gen !== this.generation) { await this.mux.disconnect().catch(() => undefined); return }
      this.mux.addListener((event) => {
        if (this.stopped || gen !== this.generation) return
        const message = event as { type: string; data: unknown }
        if (message.type === 'Close' || message.type === 'Error') {
          fail(message.type === 'Close' ? 'mux 流断开' : 'mux 流错误')
          return
        }
        if (message.type !== 'Text' || typeof message.data !== 'string') return
        try {
          const frame = parseServerRequest(message.data)
          if (frame === null) return
          this.callbacks.onMux(frame.payload as MuxFrame, frame.rpcId)
        } catch { /* 帧解析失败忽略 */ }
      })
      muxOpen = true
      void maybeReady()
    } catch (error) {
      fail(`mux 流连接失败：${error instanceof Error ? error.message : String(error)}`)
      return
    }

    // ---- host 流 ----
    try {
      this.host = await Websocket.connect(hostUrl)
      if (this.stopped || gen !== this.generation) { await this.host.disconnect().catch(() => undefined); return }
      this.host.addListener((event) => {
        if (this.stopped || gen !== this.generation) return
        const message = event as { type: string; data: unknown }
        if (message.type === 'Close' || message.type === 'Error') {
          fail(message.type === 'Close' ? 'host 流断开' : 'host 流错误')
          return
        }
        if (message.type !== 'Text' || typeof message.data !== 'string') return
        try {
          const frame = parseServerRequest(message.data)
          if (frame === null) return
          this.callbacks.onHost(frame.payload as HostFrame)
        } catch { /* 帧解析失败忽略 */ }
      })
      hostOpen = true
      void maybeReady()
    } catch (error) {
      fail(`host 流连接失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private scheduleRetry(detail: string): void {
    this.setStatus('error', detail)
    const gen = this.generation
    const delay = Math.min(500 * 2 ** gen, 10_000)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.stopped || gen !== this.generation) return
      this.generation += 1
      void this.connectOnce(this.generation)
    }, delay)
  }

  private setStatus(status: ConnectionStatus, detail?: string): void {
    if (this.status === status) return
    this.status = status
    this.callbacks.onStatusChange(status, detail)
  }
}

function parseServerRequest(data: string): ServerRequest | null {
  const parsed = JSON.parse(data) as ServerRequest
  if (parsed?.type !== 'server-request') return null
  return parsed
}
