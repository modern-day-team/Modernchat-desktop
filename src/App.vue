<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { checkVersion, CLIENT_IDENTITY, restoreToken } from './core/network';

const version = ref<{ minVersion: string; upgradeRequired: boolean; message?: string } | null>(null);
const status = ref('检测主仓库连接中…');

onMounted(async () => {
  restoreToken();
  try {
    const r = await checkVersion();
    version.value = r;
    status.value = r.upgradeRequired
      ? (r.message ?? '有新版本可用，请升级后使用')
      : '主仓库连接正常';
  } catch {
    status.value = '无法连接主仓库，请检查服务地址';
  }
});
</script>

<template>
  <main class="container">
    <h1>ModernChat Desktop</h1>
    <p>{{ status }}</p>
    <p v-if="version?.upgradeRequired" class="warn">最低版本 {{ version.minVersion }}</p>
    <p class="hint">
      客户端标识：{{ CLIENT_IDENTITY.platform }} / {{ CLIENT_IDENTITY.clientType }} /
      {{ CLIENT_IDENTITY.appVersion }}
    </p>
  </main>
</template>

<style scoped>
.container {
  min-height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: Inter, "Segoe UI", Avenir, Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  background: #f6f7f9;
}

h1 {
  font-size: 28px;
  font-weight: 600;
}

.warn {
  color: #c00000;
}

.hint {
  font-size: 12px;
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .container {
    color: #f6f6f6;
    background: #16181d;
  }

  .hint {
    color: #9ca3af;
  }
}
</style>
