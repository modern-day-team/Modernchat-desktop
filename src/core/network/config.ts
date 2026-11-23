import { version as appVersion } from '../../../package.json'

/** 主仓库 API 根地址。打包时改成实际服务域名；开发默认指向本机 :8080。 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

/** 二维码载荷里的站点前缀：默认与 API 同域，独立前端部署时用 VITE_QR_BASE 覆盖。 */
export const QR_BASE = import.meta.env.VITE_QR_BASE ?? API_BASE

/** Tauri WebView 的 Origin 必须由运维加入主仓库 FRONTEND_URL 白名单：
 *  dev = http://localhost:1420，Windows prod = https://tauri.localhost，macOS = tauri://localhost。 */
export const CLIENT_IDENTITY = {
  platform: 'desktop',
  clientType: 'tauri',
  appVersion,
} as const

export const CLIENT_HEADERS: Record<string, string> = {
  'X-Client-Platform': CLIENT_IDENTITY.platform,
  'X-Client-Type': CLIENT_IDENTITY.clientType,
  'X-Client-Version': CLIENT_IDENTITY.appVersion,
}

export const CLIENT_WS_QUERY = new URLSearchParams({
  platform: CLIENT_IDENTITY.platform,
  clientType: CLIENT_IDENTITY.clientType,
  appVersion: CLIENT_IDENTITY.appVersion,
})
