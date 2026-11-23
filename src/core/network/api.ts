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

/** 当前登录用户（用于区分自己/他人消息气泡）。 */
export interface Me {
  id: number
  username: string
  nickname?: string
}

export function fetchMe() {
  return request<Me>('/me')
}

// ---- 会话与消息 ----

/** 会话行（只取最小闭环需要的字段，与 proto.ts Conversation 对齐）。 */
export interface Conversation {
  id: number
  type: number // 1=单聊 2=群聊 3=系统公告（不展示）
  name: string
  peer?: { id: number; nickname: string; avatarColor?: string }
  lastMessageId?: number
  lastMessagePreview?: string
  lastMessageAt?: string
  unreadCount?: number
  pinned?: boolean
}

/** 引用消息摘要（与 proto.ts ReplyBrief 对齐）。 */
export interface ReplyBrief {
  id: number
  senderId: number
  senderNickname: string
  msgType: string
  content: string
  isRecalled: boolean
}

export interface Message {
  id: number
  conversationId: number
  senderId: number
  clientMsgId?: string
  msgType: string
  content: string
  createdAt: string
  replyToId?: number
  replyTo?: ReplyBrief
  isRecalled?: boolean
  recalledAt?: string
  editedAt?: string
  pending?: boolean
  failed?: boolean
}

/** 标记已读（REST 兜底，WS read 帧为实时通道）。 */
export function markRead(convId: number, upToId: number) {
  return request<{ ok: boolean }>(`/conversations/${convId}/read`, {
    method: 'POST',
    body: JSON.stringify({ upToId }),
  })
}

export function listConversations() {
  return request<Conversation[]>('/conversations')
}

export function listMessages(convId: number, limit = 30) {
  const q = new URLSearchParams({ limit: String(limit) })
  return request<{ messages: Message[]; hasMore: boolean }>(
    `/conversations/${convId}/messages?${q.toString()}`,
  )
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
