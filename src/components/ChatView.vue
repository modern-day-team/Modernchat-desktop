<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { useChat } from '../composables/useChat'
import { CLIENT_IDENTITY, currentToken, setToken } from '../core/network'

const emit = defineEmits<{ (e: 'logged-out'): void }>()
const draft = ref('')

const {
  conversations,
  myId,
  activeId,
  messages,
  loading,
  start,
  openConversation,
  sendText,
} = useChat(() => {
  void setToken(null)
  emit('logged-out')
})

onMounted(start)

function send() {
  const text = draft.value
  if (!text.trim()) return
  void sendText(text)
  draft.value = ''
}

function displayName(c: { id: number; name: string; peer?: { nickname: string } }) {
  return c.peer?.nickname || c.name || `会话 ${c.id}`
}

function logout() {
  void setToken(null)
  emit('logged-out')
}
</script>

<template>
  <div class="chat">
    <aside class="chat__sidebar">
      <header class="chat__brand">
        <strong>ModernChat</strong>
        <span class="chat__who">{{ currentToken() ? '已登录' : '' }}</span>
      </header>
      <p class="chat__label">会话</p>
      <div class="chat__list">
        <button
          v-for="c in conversations"
          :key="c.id"
          type="button"
          class="chat__item"
          :class="{ 'is-active': c.id === activeId }"
          @click="openConversation(c.id)"
        >
          <span class="chat__item-name">{{ displayName(c) }}</span>
          <span class="chat__item-preview">{{ c.lastMessagePreview || '暂无消息' }}</span>
        </button>
        <p v-if="!conversations.length" class="chat__empty">暂无会话</p>
      </div>
      <footer class="chat__foot">
        <span>{{ CLIENT_IDENTITY.clientType }} · {{ CLIENT_IDENTITY.appVersion }}</span>
        <button type="button" class="chat__link" @click="logout">退出</button>
      </footer>
    </aside>

    <main class="chat__main">
      <template v-if="activeId !== null">
        <header class="chat__head">
          {{ displayName(conversations.find((c) => c.id === activeId) ?? { name: '', id: activeId }) }}
        </header>
        <div class="chat__messages">
          <p v-if="loading" class="chat__empty">加载中…</p>
          <p v-else-if="!messages.length" class="chat__empty">暂无消息，发送第一条吧</p>
          <div
            v-for="m in messages"
            :key="m.clientMsgId || m.id"
            class="chat__bubble"
            :class="{ 'is-mine': m.senderId === myId, 'is-pending': m.pending }"
          >
            <span class="chat__bubble-content">{{ m.content }}</span>
          </div>
        </div>
        <form class="chat__composer" @submit.prevent="send">
          <input v-model="draft" class="chat__input" placeholder="输入消息…" />
          <button type="submit" class="chat__send" :disabled="!draft.trim()">发送</button>
        </form>
      </template>
      <div v-else class="chat__placeholder">选择一个会话开始聊天</div>
    </main>
  </div>
</template>

<style scoped>
.chat {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
  color: var(--mc-text);
  background: var(--mc-bg-page);
}

.chat__sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--mc-hairline);
  background: var(--mc-bg-container);
}

.chat__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: var(--mc-fs-title);
}

.chat__who,
.chat__label,
.chat__empty {
  font-size: var(--mc-fs-sm);
  color: var(--mc-text-faint);
}

.chat__label {
  padding: 0 16px 8px;
}

.chat__list {
  flex: 1;
  overflow-y: auto;
}

.chat__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.chat__item:hover {
  background: var(--mc-bg-raised);
}

.chat__item.is-active {
  background: var(--mc-bg-raised);
}

.chat__item-name {
  font-size: var(--mc-fs-emphasis);
}

.chat__item-preview {
  font-size: var(--mc-fs-sm);
  color: var(--mc-text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--mc-hairline);
  font-size: var(--mc-fs-caption);
  color: var(--mc-text-faint);
}

.chat__link {
  border: none;
  background: none;
  color: var(--mc-link);
  cursor: pointer;
  font-size: var(--mc-fs-sm);
}

.chat__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat__head {
  padding: 16px;
  border-bottom: 1px solid var(--mc-hairline);
  font-size: var(--mc-fs-title);
}

.chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat__bubble {
  max-width: 70%;
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: var(--mc-radius-md);
  background: var(--mc-bg-container);
  font-size: var(--mc-fs-body);
}

.chat__bubble.is-mine {
  align-self: flex-end;
  background: var(--mc-brand);
  color: #fff;
}

.chat__bubble.is-pending {
  opacity: 0.6;
}

.chat__composer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--mc-hairline);
  background: var(--mc-bg-container);
}

.chat__input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--mc-hairline);
  border-radius: var(--mc-radius-sm);
  background: var(--mc-bg-page);
  color: var(--mc-text);
  font: inherit;
  font-size: var(--mc-fs-body);
}

.chat__send {
  padding: 8px 16px;
  border: none;
  border-radius: var(--mc-radius-sm);
  background: var(--mc-brand);
  color: #fff;
  cursor: pointer;
  font-size: var(--mc-fs-body);
}

.chat__send:disabled {
  opacity: 0.5;
  cursor: default;
}

.chat__placeholder {
  margin: auto;
  color: var(--mc-text-faint);
}
</style>
