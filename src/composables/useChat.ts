import { onBeforeUnmount, ref } from 'vue'

import {
  fetchMe,
  listConversations,
  listMessages,
  type Conversation,
  type Message,
  WsClient,
  type WsFrame,
} from '../core/network'

/** 最小聊天闭环：会话列表 → 历史消息 → 发文本消息 → WS message 入列。 */
export function useChat(onKicked: (reason: string) => void) {
  const conversations = ref<Conversation[]>([])
  const myId = ref<number>(0)
  const activeId = ref<number | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const sending = ref(false)

  const ws = new WsClient()
  ws.onKicked = onKicked
  ws.onFrame = handleFrame
  ws.onOpen = (reconnected) => {
    if (reconnected) void loadConversations()
  }

  function handleFrame(frame: WsFrame) {
    if (frame.type === 'message') {
      const msg: Message = {
        id: Number(frame.id),
        conversationId: Number(frame.convId),
        senderId: Number((frame.from as { id: number })?.id ?? 0),
        clientMsgId: typeof frame.clientMsgId === 'string' ? frame.clientMsgId : undefined,
        msgType: String(frame.msgType ?? 'text'),
        content: String(frame.content ?? ''),
        createdAt: String(frame.createdAt ?? ''),
      }
      // optimistic 消息用 clientMsgId 对齐替换，避免重复
      const idx = messages.value.findIndex(
        (m) => m.pending && m.clientMsgId === msg.clientMsgId,
      )
      if (idx >= 0) messages.value.splice(idx, 1, msg)
      else if (msg.conversationId === activeId.value) messages.value.push(msg)

      void loadConversations() // 更新列表预览
      return
    }
    if (frame.type === 'conv_change') void loadConversations()
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
    loading.value = true
    try {
      const r = await listMessages(id, 30)
      messages.value = r.messages ?? []
    } catch {
      messages.value = []
    } finally {
      loading.value = false
    }
  }

  async function sendText(content: string) {
    const text = content.trim()
    if (!text || activeId.value === null || sending.value) return
    sending.value = true
    const clientMsgId = crypto.randomUUID()
    // optimistic 入列，服务端 message 帧回来后按 clientMsgId 替换
    messages.value.push({
      id: 0,
      conversationId: activeId.value,
      senderId: myId.value,
      clientMsgId,
      msgType: 'text',
      content: text,
      createdAt: new Date().toISOString(),
      pending: true,
    })
    ws.send({
      type: 'chat',
      convId: activeId.value,
      clientMsgId,
      content: text,
      msgType: 'text',
    })
    sending.value = false
  }

  function start() {
    void fetchMe().then((me) => { myId.value = me.id }).catch(() => undefined)
    void loadConversations()
    ws.connect()
  }

  onBeforeUnmount(() => ws.disconnect())

  return {
    conversations,
    myId,
    activeId,
    messages,
    loading,
    sending,
    start,
    openConversation,
    sendText,
  }
}
