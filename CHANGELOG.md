# 更新日志

## [未发布]

- docs：修正 README 中“脚手架示例页/仅完成骨架”的过时描述，使其与已实现的聊天闭环一致
- feat(release)：新增签名发布工作流（`v*` tag / 手动触发）——Android 由 GitHub Secrets 生成正式 key.properties 并验签；iOS 导入分发证书与 provisioning profile 生成签名 IPA；Windows 用 PFX 签 MSI/NSIS，macOS 用 Developer ID 签名并公证 DMG；缺任一签名 Secret 即失败，不回退 unsigned 包
- fix(lint)：补齐 `oxlint` / `eslint` 配置与依赖（与主仓库 web 同体系，新增 `npm run lint`），CI web job 增加 lint 门禁；移除 `vite-env.d.ts` 里过时的 `.vue` 模块声明（`{}` + `any` 触发 3 条 lint 错误），保留 Vite 客户端类型引用
- test(审计整改)：新增 Vitest 测试框架与 WS 下行帧解析单测（合法帧 / pong / kicked 中文原因 / 非法 JSON / 缺 type / 未知类型）；`parseFrame` 从 `onmessage` 提取为纯函数，行为不变
- ci：新增 GitHub Actions——web 任务跑 `npm test` + `npm run build`，rust 任务在 Windows 跑 `cargo fmt --check` + `cargo clippy -D warnings` + `cargo test`

## 0.1.0

- 最小聊天闭环：扫码登录（票据存系统钥匙串）、会话列表、历史 30 条、WS 实时收发与重连 resync
- 已读回执 / 撤回编辑 / 引用回复 / 输入状态接入
- 设计令牌层与分层架构（传输层 / 业务 API / 流程编排）
