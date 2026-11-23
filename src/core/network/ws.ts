import { API_BASE, CLIENT_WS_QUERY } from './config'
import { currentToken } from './http'

export interface WsFrame {
  type: string
  [key: string]: unknown
}

const HEARTBEAT_INTERVAL = 25_000
const PONG_TIMEOUT = 8_000
const MAX_RECONNECT_DELAY = 30_000

/** WS 客户端：握手带客户端标识，25s 心跳 + 8s pong 超时 + 指数退避重连。
 *  kicked（强制下线）不重连，由调用方回登录页。 */
export class WsClient {
  private socket: WebSocket | null = null
  private heartbeat: number | null = null
  private pongTimer: number | null = null
  private reconnectTimer: number | null = null
  private delay = 1_000
  private everConnected = false
  private stopped = false

  onFrame: ((frame: WsFrame) => void) | null = null
  onKicked: ((reason: string) => void) | null = null
  /** 每次成功连接触发；首次=false、重连=true，调用方可借此 resync。 */
  onOpen: ((reconnected: boolean) => void) | null = null

  connect() {
    this.stopped = false
    this.open()
  }

  private open() {
    this.closeSocket()
    const token = currentToken()
    if (!token || this.stopped) return

    const url = API_BASE.replace(/^http/, 'ws')
    const query = new URLSearchParams(CLIENT_WS_QUERY)
    query.set('token', token)
    const ws = new WebSocket(`${url}/ws?${query.toString()}`)
    this.socket = ws

    ws.onopen = () => {
      const reconnected = this.everConnected
      this.everConnected = true
      this.delay = 1_000
      this.heartbeat = window.setInterval(() => {
        this.send({ type: 'ping' })
        if (this.pongTimer) window.clearTimeout(this.pongTimer)
        this.pongTimer = window.setTimeout(() => {
          // 8s 未收到 pong：判定僵死连接，主动关闭触发重连
          this.closeSocket()
          this.scheduleReconnect()
        }, PONG_TIMEOUT)
      }, HEARTBEAT_INTERVAL)
      this.onOpen?.(reconnected)
    }

    ws.onmessage = (ev) => {
      let frame: WsFrame
      try {
        frame = JSON.parse(ev.data as string) as WsFrame
      } catch {
        return
      }
      if (frame.type === 'pong') {
        if (this.pongTimer) window.clearTimeout(this.pongTimer)
        this.pongTimer = null
        return
      }
      if (frame.type === 'kicked') {
        this.stopped = true
        this.closeSocket()
        this.onKicked?.(String(frame.reason ?? '登录状态已失效'))
        return
      }
      this.onFrame?.(frame)
    }

    ws.onclose = () => {
      this.closeSocket()
      this.scheduleReconnect()
    }
    ws.onerror = () => ws.close()
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return
    const wait = this.delay
    this.delay = Math.min(this.delay * 2, MAX_RECONNECT_DELAY)
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, wait)
  }

  /** 只关连接与心跳，不置 stopped（供重连使用）。 */
  private closeSocket() {
    if (this.heartbeat) window.clearInterval(this.heartbeat)
    if (this.pongTimer) window.clearTimeout(this.pongTimer)
    this.heartbeat = null
    this.pongTimer = null
    this.socket?.close()
    this.socket = null
  }

  send(frame: WsFrame) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(frame))
    }
  }

  disconnect() {
    this.stopped = true
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.closeSocket()
  }
}
