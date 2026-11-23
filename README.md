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

## 后续接入

当前仅完成骨架，尚未接入主仓库的业务逻辑。接入时需要决定：

- 认证：复用主仓库 JWT（`Authorization` 头 + `mc_auth` cookie），Cookie 在 Tauri WebView 中的跨域行为需实测；必要时改用 Rust 侧 HTTP 客户端代管会话。
- 实时链路：主仓库 WS `/ws?token=` 的 Origin 白名单（`FRONTEND_URL`）需加入 `tauri://localhost` / `http://tauri.localhost`，否则握手被拒。
- 静态资源：主仓库 `web/` 构建 `base: '/app/'`，桌面端若复用其代码需处理 base 路径与 API 绝对地址。
