# contracts/ — 主仓库契约金样本同步副本

本目录的 `ws-frames.json` 是主仓库（Modernchat-new）`contracts/ws-frames.json` 的**同步副本**，供 `src/core/network/ws.test.ts` 直接消费，断言桌面端 WS 帧解析口径与主仓库一致。

- **禁止直接修改本副本**：改契约一律先改主仓库（`docs/后端需求规格.md` → 金样本 → `proto.ts`），再复制过来；
- `ws-frames.sha256` 是副本的 LF 归一化 SHA-256 指纹，CI（`scripts/check-contracts.mjs`）用它校验副本未被本地手改——改副本不改指纹会挂 CI；
- 同步步骤：复制主仓库 `contracts/ws-frames.json` 到本目录 → 用主仓库 `contracts/README.md` 中的指纹生成命令重算 `ws-frames.sha256` → 提交。

契约总览与跨端能力矩阵见主仓库 `docs/项目组架构与集成.md`。
