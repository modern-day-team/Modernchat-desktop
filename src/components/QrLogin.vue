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
