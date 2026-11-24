# 更新日志

## [未发布]

- test(审计整改)：新增 Vitest 测试框架与 WS 下行帧解析单测（合法帧 / pong / kicked 中文原因 / 非法 JSON / 缺 type / 未知类型）；`parseFrame` 从 `onmessage` 提取为纯函数，行为不变
- ci：新增 GitHub Actions——web 任务跑 `npm test` + `npm run build`，rust 任务在 Windows 跑 `cargo fmt --check` + `cargo clippy -D warnings` + `cargo test`

## 0.1.0

- 最小聊天闭环：扫码登录（票据存系统钥匙串）、会话列表、历史 30 条、WS 实时收发与重连 resync
- 已读回执 / 撤回编辑 / 引用回复 / 输入状态接入
- 设计令牌层与分层架构（传输层 / 业务 API / 流程编排）
