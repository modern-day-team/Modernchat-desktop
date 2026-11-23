import { CLIENT_IDENTITY, QR_BASE } from './config'
import { request } from './http'

// ---- 扫码登录（桌面展示二维码，手机端确认）----

export interface QrStart {
  token: string
  expiresAt: string
}

export interface QrStatus {
  status: 'pending' | 'confirmed' | 'expired'
  token?: string
  user?: unknown
}

/** 发起扫码会话（公开接口）。票据仅存 body，不进 URL/日志。 */
export function qrStart() {
  return request<QrStart>('/auth/qr/start', { method: 'POST' })
}

/** 轮询扫码结果（2.5s 一次，confirmed 一次性消费）。 */
export function qrStatus(ticket: string) {
  return request<QrStatus>('/auth/qr/status', {
    method: 'POST',
    body: JSON.stringify({ token: ticket }),
  })
}

/** 二维码内容：手机端扫此链接后提取票据并调用 confirm。 */
export function qrPayload(ticket: string) {
  return `${QR_BASE.replace(/\/$/, '')}/app/qr/${ticket}`
}

// ---- 会话管理 ----

export interface UserSession {
  id: string
  platform: string
  clientType: string
  appVersion: string
  ip: string
  createdAt: string
  lastSeenAt: string
  current: boolean
}

export function listSessions() {
  return request<{ sessions: UserSession[] }>('/me/sessions')
}

export function revokeSession(id: string) {
  return request<{ ok: boolean }>(`/me/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---- 版本协商 ----

export interface VersionCheck {
  version: string
  minVersion: string
  upgradeRequired: boolean
  message?: string
}

export function checkVersion() {
  const q = new URLSearchParams({
    platform: CLIENT_IDENTITY.platform,
    clientType: CLIENT_IDENTITY.clientType,
    appVersion: CLIENT_IDENTITY.appVersion,
  })
  return request<VersionCheck>(`/client/version?${q.toString()}`)
}
