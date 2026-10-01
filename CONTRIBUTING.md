# 开发与发布

## 分支约定

-   `master`：pot-guling 的主源码分支，承载已合入的功能与项目文档。
-   `dev/guling-ui`：保留的历史开发分支。新改动应从最新 master 分出工作分支，再合回 master。
-   发布标签：对应实际发布源码。已有标签及附件不因主分支整理而重写。

仓库地址沿用 `https://github.com/shen1950/pot-desktop`。本机旧仓库可能将 `origin` 指向上游、`mine` 指向个人 fork；推送前核对目标仓库，避免向上游推送。不要把含凭据的远端 URL 贴进日志或文档。

## 验证

```bash
pnpm install --frozen-lockfile
pnpm check:project
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --locked --bin pot
pnpm tauri build --bundles nsis -- --locked
```

修改翻译、OCR 或追问逻辑后，还应在桌面环境验证对应服务。涉及 Windows 重启时，参考 [v1.4.7 验证说明](docs/restart-v1.4.7-verification.md)。其中的历史验证结果不代表后来每次提交都通过了相同的桌面测试。

## GitHub Actions

-   `CI`：master 推送及 Pull Request 执行前端安装、构建和项目配置检查。
-   `Build pot-guling (Windows x64)`：手动触发，执行 Rust 测试并构建 NSIS 安装包，上传到 Actions artifacts，附 SHA-256。
-   构建流程不自动发布、不修改已有 Release、不生成上游 updater 标签，也不依赖上游签名密钥。
-   构建校验 package.json、tauri.conf.json、Cargo.toml 和 Cargo.lock 的版本一致性。开发源码保持当前版本号，正式新发布前由维护者统一递增。

发布时，从准备好的 master 提交统一更新上述四处版本号和 CHANGELOG，创建对应版本标签。在 Actions 中选择该标签运行 Windows 构建；下载并安装验证产物后，在该标签下创建 Release，附安装包、校验文件和对应更新说明。不要把未构建验证的源码修改称为已经发布。

## 项目标识与更新

应用显示名为 `pot-guling`，应用标识为 `com.guling.pot`。Rust crate 和内部兼容文件名可继续使用 `pot`，避免无必要的路径和插件兼容变更。

当前采用 Releases 手动更新。自动更新配置关闭，启动时不访问上游更新源；设置页和托盘的更新入口显示本项目下载说明。将来启用自动更新，需要本项目独立的签名密钥、受验证的更新清单和升级测试，不能复用上游的更新 URL 或公钥。

## 贡献与反馈

请在 [本仓库 Issues](https://github.com/shen1950/pot-desktop/issues) 提交问题，附版本、系统、复现步骤和必要日志；移除日志中的 API Key、令牌和私人文本。提交代码时保留上游版权和许可证信息，说明行为变化以及实际完成的验证。
