<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useChat } from '../composables/useChat'
import { CLIENT_IDENTITY, currentToken, setToken, type Message } from '../core/network'

const emit = defineEmits<{ (e: 'logged-out'): void }>()
const draft = ref('')
const editingId = ref<number | null>(null)
const editingText = ref('')
const menuFor = ref<number | null>(null)

const {
  conversations,
  myId,
  activeId,
  messages,
  loading,
  replyTarget,
  typingUntil,
  lastError,
  start,
  openConversation,
  sendText,
  recallMessage,
  editMessage,
  notifyTyping,
} = useChat(() => {
  void setToken(null)
  emit('logged-out')
})

onMounted(start)

const typingNames = computed(() =>
  Object.entries(typingUntil.value)
    .filter(([, until]) => until > Date.now())
    .map(([uid]) => `用户 ${uid}`),
)

function send() {
  const text = draft.value
  if (!text.trim()) return
  void sendText(text)
  draft.value = ''
}

function onDraftInput() {
  notifyTyping()
}

function displayName(c: { id: number; name: string; peer?: { nickname: string } }) {
  return c.peer?.nickname || c.name || `会话 ${c.id}`
}

function quote(m: Message) {
  replyTarget.value = m
  menuFor.value = null
}

function beginEdit(m: Message) {
  editingId.value = m.id
  editingText.value = m.content
  menuFor.value = null
}

function commitEdit() {
  if (editingId.value === null) return
  editMessage(editingId.value, editingText.value)
  editingId.value = null
}

function doRecall(m: Message) {
  recallMessage(m.id)
  menuFor.value = null
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
          <span class="chat__item-name">
            {{ displayName(c) }}
            <span v-if="c.unreadCount" class="chat__unread num">{{ c.unreadCount }}</span>
          </span>
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
            class="chat__bubble-wrap"
            :class="{ 'is-mine': m.senderId === myId }"
          >
            <div
              class="chat__bubble"
              :class="{ 'is-pending': m.pending, 'is-failed': m.failed }"
              @click="menuFor = menuFor === m.id ? null : m.id"
            >
              <span v-if="m.replyTo && !m.isRecalled" class="chat__quote">
                {{ m.replyTo.senderNickname }}：{{ m.replyTo.content || '[媒体]' }}
              </span>
              <span class="chat__bubble-content">
                {{ m.isRecalled ? '消息已撤回' : m.content }}
              </span>
              <span v-if="m.editedAt && !m.isRecalled" class="chat__edited">已编辑</span>
            </div>
            <div v-if="menuFor === m.id && m.id > 0 && !m.isRecalled" class="chat__menu">
              <button type="button" @click="quote(m)">引用</button>
              <template v-if="m.senderId === myId">
                <button v-if="m.msgType === 'text'" type="button" @click="beginEdit(m)">编辑</button>
                <button type="button" @click="doRecall(m)">撤回</button>
              </template>
            </div>
            <div v-if="editingId === m.id" class="chat__editbar">
              <input v-model="editingText" class="chat__input" @keyup.enter="commitEdit" />
              <button type="button" class="chat__link" @click="commitEdit">保存</button>
              <button type="button" class="chat__link" @click="editingId = null">取消</button>
            </div>
          </div>
        </div>
        <p v-if="lastError" class="chat__error">{{ lastError }}</p>
        <p v-if="typingNames.length" class="chat__typing">{{ typingNames.join('、') }} 正在输入…</p>
        <div v-if="replyTarget" class="chat__replybar">
          <span>引用：{{ replyTarget.content || '[媒体]' }}</span>
          <button type="button" class="chat__link" @click="replyTarget = null">取消</button>
        </div>
        <form class="chat__composer" @submit.prevent="send">
          <input v-model="draft" class="chat__input" placeholder="输入消息…" @input="onDraftInput" />
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

.chat__bubble-wrap {
  max-width: 70%;
  align-self: flex-start;
}

.chat__bubble-wrap.is-mine {
  align-self: flex-end;
}

.chat__bubble {
  padding: 8px 12px;
  border-radius: var(--mc-radius-md);
  background: var(--mc-bg-container);
  font-size: var(--mc-fs-body);
  cursor: pointer;
}

.chat__bubble-wrap.is-mine .chat__bubble {
  background: var(--mc-brand);
  color: #fff;
}

.chat__quote {
  display: block;
  margin-bottom: 4px;
  padding-left: 8px;
  border-left: 2px solid currentColor;
  font-size: var(--mc-fs-sm);
  opacity: 0.75;
}

.chat__edited,
.chat__typing,
.chat__replybar {
  font-size: var(--mc-fs-sm);
  color: var(--mc-text-faint);
}

.chat__edited {
  opacity: 0.7;
}

.chat__typing {
  margin: 0;
  padding: 0 16px 4px;
}

.chat__replybar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: var(--mc-bg-raised);
}

.chat__menu {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.chat__menu button {
  border: none;
  background: none;
  color: var(--mc-link);
  cursor: pointer;
  font-size: var(--mc-fs-sm);
}

.chat__editbar {
  display: flex;
  gap: 6px;
  padding-top: 4px;
}

.chat__unread {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: var(--mc-radius-pill);
  background: var(--mc-danger);
  color: #fff;
  font-size: var(--mc-fs-caption);
}

.chat__bubble.is-pending {
  opacity: 0.6;
}

.chat__bubble.is-failed {
  opacity: 0.6;
  outline: 1px solid var(--mc-danger);
}

.chat__error {
  margin: 0;
  padding: 4px 16px;
  font-size: var(--mc-fs-sm);
  color: var(--mc-danger);
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
