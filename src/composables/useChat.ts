import { onBeforeUnmount, ref } from 'vue'

import {
  fetchMe,
  listConversations,
  listMessages,
  markRead,
  type Conversation,
  type Message,
  WsClient,
  type WsFrame,
} from '../core/network'

const TYPING_THROTTLE = 2_000
const TYPING_EXPIRE = 3_000

/** 桌面端聊天状态机：会话 / 历史 / 发送 / 已读 / 撤回 / 编辑 / 引用 / typing。 */
export function useChat(onKicked: (reason: string) => void) {
  const conversations = ref<Conversation[]>([])
  const myId = ref<number>(0)
  const activeId = ref<number | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const sending = ref(false)
  /** 引用目标：发送时映射为 replyToId，切会话清空。 */
  const replyTarget = ref<Message | null>(null)
  /** 对方正在输入：userId → 过期时间戳。 */
  const typingUntil = ref<Record<number, number>>({})
  /** 服务端拒绝操作的中文原因（撤回超时/编辑超时等），UI 短暂提示。 */
  const lastError = ref('')
  let errorTimer: number | null = null

  const ws = new WsClient()
  ws.onKicked = onKicked
  ws.onFrame = handleFrame
  ws.onOpen = (reconnected) => {
    if (reconnected) void loadConversations()
  }

  function handleFrame(frame: WsFrame) {
    switch (frame.type) {
      case 'message': {
        const msg: Message = {
          id: Number(frame.id),
          conversationId: Number(frame.convId),
          senderId: Number((frame.from as { id: number })?.id ?? 0),
          clientMsgId: typeof frame.clientMsgId === 'string' ? frame.clientMsgId : undefined,
          msgType: String(frame.msgType ?? 'text'),
          content: String(frame.content ?? ''),
          createdAt: String(frame.createdAt ?? ''),
          replyToId: typeof frame.replyToId === 'number' ? frame.replyToId : undefined,
          replyTo: frame.replyTo as Message['replyTo'],
        }
        const idx = messages.value.findIndex((m) => m.pending && m.clientMsgId === msg.clientMsgId)
        if (idx >= 0) messages.value.splice(idx, 1, msg)
        else if (msg.conversationId === activeId.value) {
          messages.value.push(msg)
          void sendRead(activeId.value!, msg.id)
        }
        void loadConversations()
        break
      }
      case 'recall': {
        const id = Number(frame.messageId)
        const target = messages.value.find((m) => m.id === id)
        if (target) {
          target.isRecalled = true
          target.recalledAt = typeof frame.recalledAt === 'string' ? frame.recalledAt : new Date().toISOString()
        }
        void loadConversations()
        break
      }
      case 'message_update': {
        const target = messages.value.find((m) => m.id === Number(frame.id))
        if (target) {
          target.content = String(frame.content ?? '')
          target.editedAt = typeof frame.editedAt === 'string' ? frame.editedAt : new Date().toISOString()
        }
        break
      }
      case 'read': {
        if (Number(frame.userId) !== myId.value) break
        const upTo = Number(frame.upToId)
        const c = conversations.value.find((x) => x.id === Number(frame.convId))
        if (c) conversations.value = conversations.value.map((x) =>
          x.id === c.id ? { ...x, unreadCount: upTo >= (x.lastMessageId ?? 0) ? 0 : x.unreadCount } : x,
        )
        break
      }
      case 'typing': {
        const uid = Number(frame.userId)
        if (uid === myId.value || Number(frame.convId) !== activeId.value) break
        typingUntil.value = { ...typingUntil.value, [uid]: Date.now() + TYPING_EXPIRE }
        window.setTimeout(() => {
          const next = { ...typingUntil.value }
          delete next[uid]
          typingUntil.value = next
        }, TYPING_EXPIRE)
        break
      }
      case 'conv_change':
        void loadConversations()
        break
      case 'error': {
        const reason = String(frame.reason ?? '操作失败')
        if (typeof frame.clientMsgId === 'string') {
          const idx = messages.value.findIndex((m) => m.clientMsgId === frame.clientMsgId)
          if (idx >= 0) messages.value[idx] = { ...messages.value[idx], failed: true }
        }
        lastError.value = reason
        if (errorTimer) window.clearTimeout(errorTimer)
        errorTimer = window.setTimeout(() => { lastError.value = '' }, 4_000)
        break
      }
    }
  }

  async function loadConversations() {
    try {
      const list = await listConversations()
      conversations.value = (list ?? []).filter((c) => c.type !== 3)
    } catch {
      conversations.value = []
    }
  }

  async function openConversation(id: number) {
    activeId.value = id
    replyTarget.value = null
    loading.value = true
    try {
      const r = await listMessages(id, 30)
      messages.value = r.messages ?? []
      const latest = messages.value[messages.value.length - 1]
      if (latest) void sendRead(id, latest.id)
    } catch {
      messages.value = []
    } finally {
      loading.value = false
    }
  }

  let readTimer: number | null = null
  let readPending: { convId: number; upToId: number } | null = null
  /** 300ms 去抖：打开会话/新消息到达才发已读，避免刷屏。 */
  function sendRead(convId: number, upToId: number) {
    readPending = { convId, upToId }
    if (readTimer) window.clearTimeout(readTimer)
    readTimer = window.setTimeout(() => {
      if (!readPending) return
      const { convId: cid, upToId: up } = readPending
      readPending = null
      ws.send({ type: 'read', convId: cid, upToId: up })
      void markRead(cid, up).catch(() => undefined)
    }, 300)
  }

  async function sendText(content: string) {
    const text = content.trim()
    if (!text || activeId.value === null || sending.value) return
    sending.value = true
    const clientMsgId = crypto.randomUUID()
    const frame: WsFrame = {
      type: 'chat',
      convId: activeId.value,
      clientMsgId,
      content: text,
      msgType: 'text',
    }
    if (replyTarget.value) frame.replyToId = replyTarget.value.id
    messages.value.push({
      id: 0,
      conversationId: activeId.value,
      senderId: myId.value,
      clientMsgId,
      msgType: 'text',
      content: text,
      createdAt: new Date().toISOString(),
      replyToId: replyTarget.value?.id,
      replyTo: replyTarget.value ? {
        id: replyTarget.value.id,
        senderId: replyTarget.value.senderId,
        senderNickname: '',
        msgType: replyTarget.value.msgType,
        content: replyTarget.value.content,
        isRecalled: !!replyTarget.value.isRecalled,
      } : undefined,
      pending: true,
    })
    replyTarget.value = null
    ws.send(frame)
    sending.value = false
  }

  function recallMessage(id: number) {
    if (id > 0) ws.send({ type: 'recall', messageId: id })
  }

  function editMessage(id: number, content: string) {
    const text = content.trim()
    if (id > 0 && text) ws.send({ type: 'edit', messageId: id, content: text })
  }

  let lastTyping = 0
  function notifyTyping() {
    if (activeId.value === null) return
    const now = Date.now()
    if (now - lastTyping < TYPING_THROTTLE) return
    lastTyping = now
    ws.send({ type: 'typing', convId: activeId.value })
  }

  function start() {
    void fetchMe().then((me) => { myId.value = me.id }).catch(() => undefined)
    void loadConversations()
    ws.connect()
  }

  onBeforeUnmount(() => {
    if (readTimer) window.clearTimeout(readTimer)
    if (errorTimer) window.clearTimeout(errorTimer)
    ws.disconnect()
  })

  return {
    conversations,
    myId,
    activeId,
    messages,
    loading,
    sending,
    replyTarget,
    typingUntil,
    lastError,
    start,
    openConversation,
    sendText,
    recallMessage,
    editMessage,
    notifyTyping,
  }
}
