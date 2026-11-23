<script setup lang="ts">
import { useQrLogin } from '../composables/useQrLogin'

const emit = defineEmits<{ (e: 'logged-in'): void }>()
const { qrImage, state, message, secondsLeft, start } = useQrLogin(() => emit('logged-in'))
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
  border-radius: var(--mc-radius-lg);
  background: var(--mc-bg-container);
}

.qr h2 {
  margin: 0;
  font-size: var(--mc-fs-title);
}

.qr__image,
.qr__placeholder {
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
  border: 1px solid var(--mc-hairline);
  border-radius: var(--mc-radius-md);
}

.qr__message {
  margin: 0;
  font-size: var(--mc-fs-body);
  color: var(--mc-text-muted);
}

.qr__hint {
  margin: 0;
  font-size: var(--mc-fs-sm);
  color: var(--mc-text-faint);
}

.qr__retry {
  border: none;
  background: none;
  color: var(--mc-link);
  cursor: pointer;
  font-size: var(--mc-fs-body);
  padding: 4px 8px;
}
</style>
