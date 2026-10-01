# pot-guling 项目结构

| 路径                        | 用途                                  |
| --------------------------- | ------------------------------------- |
| `src/window/Translate/`     | 翻译窗口、服务结果、多窗口交互        |
| `src/window/Recognize/`     | 截图识别及追问入口                    |
| `src/window/Chat/`          | AI 追问、消息编辑、流式响应与图片输入 |
| `src/window/Config/`        | 设置、服务管理、历史与关于页          |
| `src/utils/chat_service.js` | 可用于追问的服务实例解析              |
| `src/utils/project.js`      | 项目名、源码、反馈与下载链接          |
| `src-tauri/src/window.rs`   | 桌面窗口创建和状态                    |
| `src-tauri/src/restart.rs`  | Windows 重启进程交接                  |
| `src-tauri/src/backup.rs`   | 基于当前应用标识的备份与恢复          |
| `src-tauri/tauri.conf.json` | 产品名、应用标识、安装与更新配置      |

## 与上游的边界

pot-guling 继承 Pot 的翻译、OCR、TTS、生词本、插件及多语言框架。服务适配器中指向 `pot-app.com` 的文档、词典、云备份辅助接口或服务地址，仍是对应功能的依赖；不能把这些域名机械替换成个人仓库地址。

图标沿用上游素材。文件名如 `pot_screenshot_cut.png`、内部 Rust crate 名 `pot`、插件协议和默认 HTTP 端口保留兼容含义，不等同于项目对外名称。外部调用扩展沿用对应脚本文件名，显示名和扩展标识改为 pot-guling；同时运行多个应用时应调整端口及脚本。

原有 Git 历史、LICENSE 和历史发布记录用于记录来源与归属。项目主页、反馈入口、发行元数据和更新入口则属于本 fork。

## 主分支整理

2026-10-01 整理前，master 位于上游提交 `594d32e`，pot-guling 源码位于 `dev/guling-ui`，v1.4.7 标签对应 `f5c0ff3`。此次将这段开发历史纳入主分支，并整理项目介绍、运行时品牌和构建流程。源码长期存在于开发分支，不能仅凭旧 master 判断此 fork 没有二次开发。
