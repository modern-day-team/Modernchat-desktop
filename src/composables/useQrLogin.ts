import { onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'

import { qrPayload, qrStart, qrStatus, setToken } from '../core/network'

/** 扫码登录流程状态机：生成票据 → 渲染二维码 → 2.5s 轮询 → 一次性消费 → 落 token。 */
export function useQrLogin(onLoggedIn: () => void) {
  const qrImage = ref('')
  const state = ref<'loading' | 'ready' | 'expired' | 'error'>('loading')
  const message = ref('正在生成登录二维码…')
  const secondsLeft = ref(0)

  let ticket = ''
  let pollTimer: number | null = null
  let countdownTimer: number | null = null
  let disposed = false

  function stopTimers() {
    if (pollTimer) window.clearInterval(pollTimer)
    if (countdownTimer) window.clearInterval(countdownTimer)
    pollTimer = null
    countdownTimer = null
  }

  async function poll() {
    if (!ticket || disposed) return
    try {
      const r = await qrStatus(ticket)
      if (disposed) return
      if (r.status === 'confirmed' && r.token) {
        stopTimers()
        await setToken(r.token)
        message.value = '登录成功'
        onLoggedIn()
        return
      }
      if (r.status === 'expired') {
        stopTimers()
        state.value = 'expired'
        message.value = '二维码已过期，请重新生成'
      }
    } catch {
      // 网络抖动不打断轮询，下一次自然重试
    }
  }

  async function start() {
    stopTimers()
    state.value = 'loading'
    message.value = '正在生成登录二维码…'
    try {
      const r = await qrStart()
      if (disposed) return
      ticket = r.token
      qrImage.value = await QRCode.toDataURL(qrPayload(ticket), {
        width: 220,
        margin: 1,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
      if (disposed) return
      state.value = 'ready'
      message.value = '请用手机端扫描二维码并确认登录'
      secondsLeft.value = Math.max(0, Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 1000))
      countdownTimer = window.setInterval(() => {
        secondsLeft.value = Math.max(0, secondsLeft.value - 1)
      }, 1000)
      pollTimer = window.setInterval(poll, 2500)
    } catch {
      if (disposed) return
      state.value = 'error'
      message.value = '无法连接主仓库，请检查服务地址'
    }
  }

  onMounted(start)
  onBeforeUnmount(() => {
    disposed = true
    stopTimers()
  })

  return { qrImage, state, message, secondsLeft, start }
}
