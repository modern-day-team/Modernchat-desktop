<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ChatView from './components/ChatView.vue'
import QrLogin from './components/QrLogin.vue'
import { checkVersion, restoreToken } from './core/network'

const loggedIn = ref(false)
const version = ref<{ minVersion: string; upgradeRequired: boolean; message?: string } | null>(null)
const status = ref('检测主仓库连接中…')

onMounted(async () => {
  loggedIn.value = !!(await restoreToken())
  try {
    const r = await checkVersion()
    version.value = r
    status.value = r.upgradeRequired
      ? (r.message ?? '有新版本可用，请升级后使用')
      : '主仓库连接正常'
  } catch {
    status.value = '无法连接主仓库，请检查服务地址'
  }
})
</script>

<template>
  <div class="app">
    <p v-if="version?.upgradeRequired" class="app__warn">最低版本 {{ version.minVersion }} · {{ status }}</p>
    <QrLogin v-if="!loggedIn" @logged-in="loggedIn = true" />
    <ChatView v-else @logged-out="loggedIn = false" />
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
}

.app__warn {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: 6px 12px;
  text-align: center;
  font-size: var(--mc-fs-sm);
  color: var(--mc-danger);
  background: var(--mc-bg-container);
  border-bottom: 1px solid var(--mc-hairline);
}
</style>
