# ModernChat Desktop

ModernChat 项目组的桌面端，基于 **Tauri 2 + Vue 3 + TypeScript + Vite**。可独立运行，作为核心项目 `Modernchat-new` 的桌面组件。

## 环境要求

- Node.js 20.19+ / 22.12+（当前 Vite 8 要求）
- Rust 1.77+（Tauri 2）
- Windows 需安装 WebView2 Runtime 与 MSVC C++ 构建工具

## 常用命令

```powershell
npm install                  # 安装前端依赖与 Tauri CLI
npm run dev                  # 仅前端开发，Vite :1420
npm run build                # 类型检查 + 前端构建
npm run tauri dev            # 启动桌面应用开发模式（自动拉起 Vite）
npm run tauri build          # 构建安装包（生成到 src-tauri/target/release/bundle）
cd src-tauri; cargo check    # 仅检查 Rust 侧
```

## 结构

```
src/                 Vue 3 前端（当前为脚手架示例页）
src-tauri/           Rust 侧（Tauri 2）
  tauri.conf.json    应用配置：productName / identifier / 窗口 / 打包图标
  src/main.rs        Windows 下隐藏控制台，调用 lib::run()
  src/lib.rs         Tauri Builder 装配，当前注册示例命令 greet
  icons/             应用图标
```

`identifier` 为 `com.modernchat.desktop`，与主仓库移动端 `com.modernchat` 前缀一致。

## 已实现功能

扫码登录后进入最小聊天界面：会话列表 → 选会话看历史（最近 30 条）→ 发文本消息 → WS `message` 帧实时入列。发送用 optimistic 入列 + `clientMsgId` 去重替换；WS 25s 心跳 + 8s pong 超时 + 指数退避重连（重连后自动重拉会话列表）。`kicked` 帧清本地 token 并回登录页。

第二批已接入：**已读回执**（WS `read` 帧 + `POST /conversations/:id/read` 兜底，300ms 去抖、多端同步清未读、会话列表未读红点）、**消息撤回/编辑**（`recall` / `edit` 帧，`recall`/`message_update` 帧就地更新，服务端拒绝原因经 `error` 帧提示）、**引用回复**（`chat` 帧带 `replyToId`，气泡显示引用摘要）、**输入状态**（`typing` 帧 2s 节流 + 3s 过期）。

**尚未接入**：图片/语音、转发/@、消息搜索、插件、收藏、多端已读同步之外的状态类等（主仓库协议已支持，按后续分项接入）。

## 视觉约定

`src/assets/main.css` 的 `--mc-*` 令牌与主仓库 `docs/UI设计方案.md` §3.0 跨端色板一致；组件只引用令牌，不硬编码色值/圆角/字号。

## 架构约定

`core/network/http.ts` 只做传输（token + REST），业务 API 在 `core/network/api.ts`，扫码流程编排在 `composables/useQrLogin.ts`，组件只消费状态与事件。服务地址只在 `core/network/config.ts` 一处定义：API 根 `VITE_API_BASE`、二维码站点前缀 `VITE_QR_BASE`（默认同 API 根）。本仓库可脱离主仓库独立运行，联合时只走 REST / WS / JWT 契约。

## 安全约定

- **访问令牌只存系统钥匙串**：`save_token` / `load_token` / `clear_token` 三个 Tauri 命令走 Rust `keyring`（Windows 凭据管理器 / macOS Keychain / Linux Secret Service）；**不写 localStorage、不写日志文件**。纯浏览器 `npm run dev` 无 Tauri runtime 时只留内存态，刷新即失效。
- 扫码登录票据经 POST body 轮询，不进 URL；二维码载荷里的票据 5 分钟一次性，服务端首轮询即消费。

## 后续接入

当前仅完成骨架，尚未接入主仓库的业务逻辑。接入时需要决定：

- **接入契约**：先读主仓库 `docs/客户端接入指南.md`（唯一真源）；`AGENTS.md` 是本地协作契约，不进远端。
- **认证**：REST 一律 `Authorization: Bearer`（主仓库已按 `FRONTEND_URL` 开启 CORS，REST 不认 cookie）；token 存 Tauri 安全存储。桌面端走二维码登录：`/auth/qr/start` → `status` 轮询 → `confirmed`，由手机端 `/auth/qr/confirm` 确认。
- **客户端标识**：REST 带 `X-Client-Platform: desktop` / `X-Client-Type: tauri` / `X-Client-Version`，WS 握手带同名 query；服务端据此在会话列表区分设备。
- **实时链路**：WS `/ws?token=&platform=desktop&clientType=tauri&appVersion=...`；Origin 白名单（`FRONTEND_URL`）需加入 `http://localhost:1420`（dev）与 `https://tauri.localhost`（Windows 生产）/ `tauri://localhost`（macOS），否则握手被拒。收到 `kicked` 帧立即清 token 断线。
- **会话与版本**：`GET/DELETE /api/me/sessions` 管理设备；启动请求 `/api/client/version` 提示升级（不阻断）。
- **静态资源**：主仓库 `web/` 构建 `base: '/app/'`，桌面端若复用其代码需处理 base 路径与 API 绝对地址。
