<img width="120px" src="public/icon.svg" align="left"/>

# pot-guling

> 基于 Pot 的个人派生版划词翻译器，聚焦 Windows 桌面下的窗口体验与设置页可用性。

![Windows](https://img.shields.io/badge/-Windows-blue?logo=windows&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-1.6.8-blue?logo=tauri)
![License](https://img.shields.io/badge/License-GPL--3.0-green.svg)

<br/>
<hr/>

## 这是什么

`pot-guling` 是 [Pot](https://github.com/pot-app/pot-desktop) 的个人派生分支，保留上游全部翻译能力（划词 / 截图 OCR / 语音合成 / 生词本 / 插件体系 / 多套快捷键入口），在此之上针对**日常实际使用中的窗口细节**做了一轮改造：设置窗口不再闪屏、可跟随系统文本缩放、尺寸会被记住，侧边栏可拖动调宽，服务删除有防误确认，历史记录能分辨具体用的是哪个服务实例。

如果你只需要一个能用的划词翻译器，请直接用上游 Pot；如果你被"设置窗口一打开先白屏一下""窗口每次都要重新拖大小""误删服务配置"这类小事烦过，这个分支可能更合手。

## 本分支的改动

| 版本 | 内容 |
|---|---|
| v1.4.6 | 修复托盘「重启应用」后软件消失的问题（改为旧进程先退出释放单实例锁，再延迟拉起新进程）；删除翻译 / 识别 / 语音 / 生词本服务实例前增加确认弹窗，避免误点直接删掉配置；历史记录改为记录**服务实例**而非服务类型，详情页顶部显示实例名称，列表图标支持悬停查看名称 |
| v1.4.5 | 设置页侧边栏分隔线可拖动调宽，双击复位，宽度持久化保存 |
| v1.4.4 | 移除设置窗口的前端最小尺寸限制，恢复原有可调范围 |
| v1.4.3 | 设置窗口适配系统文本缩放，并记忆上次关闭窗口时的尺寸 |
| v1.4.2 | 改为所有 UI 副作用应用完毕后再显示窗口，真正消除闪屏 |
| v1.4.1 | 窗口就绪后再渲染设置页面，消除语言包 / 配置加载时的闪屏 |

## 下载

前往 [Releases](../../releases) 页面，下载 `pot-guling_x.y.z_x64-setup.exe`（NSIS 安装包），双击安装即可。

已安装过上游 Pot 的用户可以放心共存：本派生版使用独立的应用标识 `com.guling.pot`，配置、历史记录、插件目录与上游互不干扰。

## 从源码构建

环境要求：Node.js ≥ 20、pnpm、Rust（stable）、Windows 下需 WebView2 与 NSIS 工具链。

```bash
pnpm install
pnpm dev                      # 前端开发服务器
pnpm tauri dev                # Tauri 开发模式
pnpm tauri build --bundles nsis   # 仅产出 NSIS 安装包
```

产物位于 `src-tauri/target/release/bundle/nsis/`。

## 与上游的关系

本仓库派生自 [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop)，沿用其 GPL-3.0 许可，上游的全部权利与版权主张继续有效；差异部分即上表所列。功能以本分支为准，不代表上游方向。
