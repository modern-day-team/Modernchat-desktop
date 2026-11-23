import { invoke } from '@tauri-apps/api/core'

import { API_BASE, CLIENT_HEADERS } from './config'

let token: string | null = null

/** 令牌只存系统钥匙串（Windows 凭据管理器 / macOS Keychain / Linux Secret Service）；
 *  纯浏览器 dev（npm run dev）无 Tauri runtime 时回退内存态，不写 localStorage。 */
export async function setToken(t: string | null) {
  token = t
  try {
    await invoke(t ? 'save_token' : 'clear_token', t ? { token: t } : {})
  } catch {
    // 钥匙串不可用（如浏览器 dev）时不阻断登录流程，仅内存持有
  }
}

export async function restoreToken(): Promise<string | null> {
  try {
    token = await invoke<string | null>('load_token')
  } catch {
    token = null
  }
  return token
}

export function currentToken() {
  return token
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** 主仓库 REST：Bearer 认证（不认 cookie），统一携带 X-Client-*。401 清本地登录态。 */
export async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  Object.entries(CLIENT_HEADERS).forEach(([k, v]) => headers.set(k, v))
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    if (res.status === 401) setToken(null)
    const msg = typeof data.error === 'string' ? data.error : '请求失败'
    throw new ApiError(msg, res.status)
  }
  return data as T
}
