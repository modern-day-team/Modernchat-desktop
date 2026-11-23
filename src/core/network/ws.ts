import { API_BASE, CLIENT_WS_QUERY } from './config'
import { currentToken } from './http'

export interface WsFrame {
  type: string
  [key: string]: unknown
}

/** 最小 WS 客户端：握手带 token + 客户端标识，处理 kicked 强制下线。 */
export class WsClient {
  private socket: WebSocket | null = null
  private heartbeat: number | null = null
  onFrame: ((frame: WsFrame) => void) | null = null
  onKicked: ((reason: string) => void) | null = null

  connect() {
    this.disconnect()
    const token = currentToken()
    if (!token) return

    const url = API_BASE.replace(/^http/, 'ws')
    const query = new URLSearchParams(CLIENT_WS_QUERY)
    query.set('token', token)
    this.socket = new WebSocket(`${url}/ws?${query.toString()}`)

    this.socket.onopen = () => {
      if (this.heartbeat) window.clearInterval(this.heartbeat)
      this.heartbeat = window.setInterval(() => this.send({ type: 'ping' }), 25_000)
    }
    this.socket.onmessage = (ev) => {
      let frame: WsFrame
      try {
        frame = JSON.parse(ev.data as string) as WsFrame
      } catch {
        return
      }
      if (frame.type === 'kicked') {
        this.disconnect()
        this.onKicked?.(String(frame.reason ?? '登录状态已失效'))
        return
      }
      this.onFrame?.(frame)
    }
    this.socket.onclose = () => this.disconnect()
  }

  send(frame: WsFrame) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(frame))
    }
  }

  disconnect() {
    if (this.heartbeat) window.clearInterval(this.heartbeat)
    this.heartbeat = null
    this.socket?.close()
    this.socket = null
  }
}
