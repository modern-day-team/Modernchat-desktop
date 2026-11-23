<script setup lang="ts">
import { onMounted, ref } from 'vue';
import QrLogin from './components/QrLogin.vue';
import { checkVersion, CLIENT_IDENTITY, restoreToken } from './core/network';

const loggedIn = ref(false);
const version = ref<{ minVersion: string; upgradeRequired: boolean; message?: string } | null>(null);
const status = ref('检测主仓库连接中…');

onMounted(async () => {
  loggedIn.value = !!(await restoreToken());
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

    <QrLogin v-if="!loggedIn" @logged-in="loggedIn = true" />
    <div v-else class="logged-in">
      <p>已登录（令牌已保存到本地安全存储）</p>
      <p class="hint">客户端：{{ CLIENT_IDENTITY.platform }} / {{ CLIENT_IDENTITY.clientType }} / {{ CLIENT_IDENTITY.appVersion }}</p>
    </div>
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
  gap: 12px;
  text-align: center;
  font-family: Inter, "Segoe UI", Avenir, Helvetica, Arial, sans-serif;
  color: var(--mc-text);
  background: var(--mc-bg-page);
}

h1 {
  margin: 0;
  font-size: var(--mc-fs-display);
  font-weight: 600;
}

.warn {
  margin: 0;
  color: var(--mc-danger);
}

.logged-in p {
  margin: 4px 0;
}

.hint {
  font-size: var(--mc-fs-sm);
  color: var(--mc-text-faint);
}
</style>
