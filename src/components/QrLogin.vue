<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import { qrPayload, qrStart, qrStatus, setToken } from '../core/network';

const emit = defineEmits<{ (e: 'logged-in'): void }>();

const qrImage = ref('');
const state = ref<'loading' | 'ready' | 'expired' | 'error'>('loading');
const message = ref('正在生成登录二维码…');
const secondsLeft = ref(0);

let ticket = '';
let pollTimer: number | null = null;
let countdownTimer: number | null = null;
let disposed = false;

function stopTimers() {
  if (pollTimer) window.clearInterval(pollTimer);
  if (countdownTimer) window.clearInterval(countdownTimer);
  pollTimer = null;
  countdownTimer = null;
}

async function start() {
  stopTimers();
  state.value = 'loading';
  message.value = '正在生成登录二维码…';
  try {
    const r = await qrStart();
    if (disposed) return;
    ticket = r.token;
    qrImage.value = await QRCode.toDataURL(qrPayload(ticket), {
      width: 220,
      margin: 1,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
    if (disposed) return;
    state.value = 'ready';
    message.value = '请用手机端扫描二维码并确认登录';
    const expires = new Date(r.expiresAt).getTime();
    secondsLeft.value = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
    countdownTimer = window.setInterval(() => {
      secondsLeft.value = Math.max(0, secondsLeft.value - 1);
    }, 1000);
    pollTimer = window.setInterval(poll, 2500);
  } catch {
    if (disposed) return;
    state.value = 'error';
    message.value = '无法连接主仓库，请检查服务地址';
  }
}

async function poll() {
  if (!ticket || disposed) return;
  try {
    const r = await qrStatus(ticket);
    if (disposed) return;
    if (r.status === 'confirmed' && r.token) {
      stopTimers();
      setToken(r.token);
      message.value = '登录成功';
      emit('logged-in');
      return;
    }
    if (r.status === 'expired') {
      stopTimers();
      state.value = 'expired';
      message.value = '二维码已过期，请重新生成';
    }
  } catch {
    // 网络抖动不打断轮询；连续失败由下一次 poll 自然重试
  }
}

onMounted(start);
onBeforeUnmount(() => {
  disposed = true;
  stopTimers();
});
</script>

<template>
  <section class="qr">
    <h2>扫码登录</h2>
    <img v-if="qrImage" class="qr__image" :src="qrImage" alt="登录二维码" />
    <div v-else class="qr__placeholder">{{ state === 'loading' ? '生成中…' : '—' }}</div>
    <p class="qr__message">{{ message }}</p>
    <p v-if="state === 'ready'" class="qr__hint num">有效期 {{ secondsLeft }} 秒</p>
    <button class="qr__retry" type="button" @click="start">重新生成</button>
  </section>
</template>

<style scoped>
.qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-radius: 12px;
  background: var(--mc-surface, #ffffff);
}

.qr h2 {
  margin: 0;
  font-size: 18px;
}

.qr__image,
.qr__placeholder {
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
  border: 1px solid var(--mc-hairline, #e5e7eb);
  border-radius: 8px;
}

.qr__message {
  margin: 0;
  font-size: 13px;
  color: var(--mc-text-muted, #6b7280);
}

.qr__hint {
  margin: 0;
  font-size: 12px;
  color: var(--mc-text-muted, #6b7280);
}

.qr__retry {
  border: none;
  background: none;
  color: var(--mc-link, #0052d9);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
}

@media (prefers-color-scheme: dark) {
  .qr {
    background: #1f2229;
  }

  .qr__image,
  .qr__placeholder {
    border-color: #3a3f4a;
  }
}
</style>
