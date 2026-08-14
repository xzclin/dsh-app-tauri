/**
 * 连接状态：dsh 在本地运行，无需配置服务器地址。
 * 流程：Rust 探测到 3080 就绪 → 发 dsh-ready → 前端 connect()。
 */

import { create } from 'zustand'
import { DshConnection, ConnectionStatus } from '../api/connection'
import { HostDescription, LOCAL_DSH_URL } from '../api/types'
import { chatStore } from './chat'

interface ConnectionState {
  status: ConnectionStatus
  detail?: string
  host?: HostDescription
  dshReady: boolean
  connection: DshConnection | null
  /** Rust 探测就绪后调用（事件 dsh-ready）。 */
  onDshReady: () => void
  /** 用户手动重试。 */
  connect: () => void
  reset: () => void
}

export const connectionStore = create<ConnectionState>((set, get) => ({
  status: 'idle',
  dshReady: false,
  connection: null,

  onDshReady: () => {
    if (get().dshReady) return
    set({ dshReady: true })
    get().connect()
  },

  connect: () => {
    const { connection, status, dshReady } = get()
    if (connection !== null || status === 'connecting' || !dshReady) return
    const conn = new DshConnection(LOCAL_DSH_URL, {
      onStatusChange: (status, detail) => set({ status, detail }),
      onMux: (frame, rpcId) => chatStore.getState().handleMux(frame, rpcId),
      onHost: (frame) => chatStore.getState().handleHost(frame),
      onConnected: (host) => {
        void chatStore.getState().refreshSessions()
        set({ host })
      },
    })
    set({ connection: conn, status: 'connecting', detail: undefined })
    conn.start()
  },

  reset: () => {
    const { connection } = get()
    connection?.stop()
    set({ connection: null, status: 'idle', host: undefined, dshReady: false })
  },
}))
