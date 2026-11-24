import { describe, expect, it } from 'vitest'

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
