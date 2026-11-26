import { describe, expect, it } from 'vitest'

// 契约金样本：主仓库 Modernchat-new contracts/ws-frames.json 的同步副本（禁止手改，CI 校验指纹）
import wsFrames from '../../../contracts/ws-frames.json'
import { parseFrame, type WsFrame } from './ws'

describe('parseFrame', () => {
  it('解析合法帧并保留字段', () => {
    const frame = parseFrame('{"type":"message","convId":3,"content":"hi"}')
    expect(frame).not.toBeNull()
    expect(frame?.type).toBe('message')
    expect(frame?.convId).toBe(3)
  })

  it('pong 帧可识别', () => {
    expect(parseFrame('{"type":"pong"}')?.type).toBe('pong')
  })

  it('kicked 帧保留中文原因', () => {
    const frame = parseFrame('{"type":"kicked","reason":"账号已被封禁"}')
    expect(frame?.type).toBe('kicked')
    expect(frame?.reason).toBe('账号已被封禁')
  })

  it('非法 JSON 返回 null（连接不被脏帧打断）', () => {
    expect(parseFrame('not json')).toBeNull()
    expect(parseFrame('')).toBeNull()
  })

  it('非对象或缺少 type 的帧返回 null', () => {
    expect(parseFrame('null')).toBeNull()
    expect(parseFrame('123')).toBeNull()
    expect(parseFrame('{"convId":1}')).toBeNull()
  })

  it('未知类型帧交给上层（客户端与服务端协议可演进）', () => {
    const frame: WsFrame | null = parseFrame('{"type":"future_frame","x":1}')
    expect(frame?.type).toBe('future_frame')
    expect(frame?.x).toBe(1)
  })
})

describe('契约金样本（contracts/ws-frames.json，真源在主仓库）', () => {
  const serverFrames = wsFrames.serverToClient as unknown as Record<string, Record<string, unknown>>
  const clientFrames = wsFrames.clientToServer as unknown as Record<string, Record<string, unknown>>

  it('服务端金样本全部可被 parseFrame 解析且类型保持', () => {
    for (const [type, frame] of Object.entries(serverFrames)) {
      const parsed = parseFrame(JSON.stringify(frame))
      expect(parsed?.type, `服务端帧 ${type} 应解析成功且类型不变`).toBe(type)
    }
  })

  it('message 帧字段口径与主仓库一致（useChat 消费的字段逐一核对）', () => {
    const f = parseFrame(JSON.stringify(serverFrames.message))
    expect(f?.id).toBe(1025)
    expect(f?.convId).toBe(1)
    expect((f?.from as { id: number }).id).toBe(7)
    expect(f?.clientMsgId).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301')
    expect(f?.msgType).toBe('text')
    expect(f?.createdAt).toBe('2026-11-26T08:00:00Z')
    expect(f?.replyToId).toBe(42)
    expect((f?.replyTo as { id: number }).id).toBe(42)
  })

  it('recall / message_update / read / typing 帧字段口径一致', () => {
    const recall = parseFrame(JSON.stringify(serverFrames.recall))
    expect(recall?.messageId).toBe(1025)
    expect(recall?.convId).toBe(1)
    expect(typeof recall?.recalledAt).toBe('string')

    const update = parseFrame(JSON.stringify(serverFrames.message_update))
    expect(update?.id).toBe(1025)
    expect(update?.content).toContain('已更正')
    expect(typeof update?.editedAt).toBe('string')

    const read = parseFrame(JSON.stringify(serverFrames.read))
    expect(read?.userId).toBe(7)
    expect(read?.upToId).toBe(1025)

    const typing = parseFrame(JSON.stringify(serverFrames.typing))
    expect(typing?.userId).toBe(7)
  })

  it('kicked / error 帧语义字段（中文 reason、clientMsgId 定位失败消息）', () => {
    const kicked = parseFrame(JSON.stringify(serverFrames.kicked))
    expect(typeof kicked?.reason).toBe('string')
    expect((kicked?.reason as string).length).toBeGreaterThan(0)

    const error = parseFrame(JSON.stringify(serverFrames.error))
    expect(error?.clientMsgId).toBe(serverFrames.error.clientMsgId)
    expect(typeof error?.reason).toBe('string')
  })

  it('上行帧结构不超出契约：桌面端实际发送的键都在金样本内', () => {
    // useChat / WsClient 实际构造的上行帧键集合（chat 含可选 replyToId）
    const sentKeys: Record<string, string[]> = {
      chat: ['type', 'convId', 'clientMsgId', 'content', 'msgType', 'replyToId'],
      typing: ['type', 'convId'],
      read: ['type', 'convId', 'upToId'],
      recall: ['type', 'messageId'],
      edit: ['type', 'messageId', 'content'],
      ping: ['type'],
    }
    for (const [type, keys] of Object.entries(sentKeys)) {
      const goldenKeys = Object.keys(clientFrames[type])
      for (const k of keys) {
        expect(goldenKeys, `上行帧 ${type} 的键 ${k} 应存在于金样本`).toContain(k)
      }
    }
  })
})
