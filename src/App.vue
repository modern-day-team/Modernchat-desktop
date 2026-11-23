<script setup lang="ts">
const title = "ModernChat Desktop";
</script>

<template>
  <main class="container">
    <h1>{{ title }}</h1>
    <p>Tauri 2 骨架已就绪，等待接入 ModernChat 业务界面。</p>
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

p {
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .container {
    color: #f6f6f6;
    background: #16181d;
  }

  p {
    color: #9ca3af;
  }
}
</style>
