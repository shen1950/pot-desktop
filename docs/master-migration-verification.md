# master 整理验证（2026-10-01）

本次以 `dev/guling-ui` 的 `f5c0ff3`（v1.4.7）为基础，将 pot-guling 开发历史纳入 master，并统一项目文档、应用介绍、反馈入口与构建流程。

开发分支与原 master 没有共同祖先，合并保留双方父提交。提交前已比对暂存源码树与通过构建、测试的 `578f386` 完全一致；之后仅补充这段合并说明。

## 已完成的检查

| 检查 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过，使用 Node.js 24.16.0 / pnpm 11.20.0，前端锁文件未变更 |
| `node .scripts/check-project.mjs` | 通过：四处版本一致、产品名及应用标识正确、主配置和备用 WebView 配置均关闭自动更新 |
| `pnpm build` | 通过，2523 个模块；存在原有 Browserslist 数据过旧、插件 eval 和大 bundle 提示 |
| Rust 后端测试 | 9 项主测试通过；1 项子进程 fixture 在主测试中单独执行并通过 |
| JSON / XML / 工作流 YAML | 解析通过 |
| `git diff --check` | 通过 |
| LICENSE | 与 v1.4.7 完全一致 |

Rust 测试使用 `cargo test --manifest-path src-tauri/Cargo.toml --target-dir D:/Office_Programs/pot/src-tauri/target --offline --bin pot`，复用已有编译缓存。去除 Tauri updater 功能后同步更新 Cargo.lock，仅移除不再需要的 updater 依赖，没有升级其余 Rust 依赖。

## 验证范围

本次未重新打包或发布安装包，未执行安装后的桌面点击回归，也未验证 macOS / Linux 构建。v1.4.7 的安装与重启验证属于 [此前的验证记录](restart-v1.4.7-verification.md)，不能作为本次 UI 变更的安装验证。

master 的新代码采用 Releases 手动更新，旧安装版本的行为不会随仓库源码变化。版本标签保留原指向，后续发布需递增版本、构建并验证对应安装包。
