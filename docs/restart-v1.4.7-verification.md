# Windows 托盘重启修复与验证（v1.4.7）

## 根因

1. 早期 `app.restart()` 启动新实例时，旧进程可能尚未释放 single-instance 插件的互斥锁，新实例被当成重复运行而退出。
2. 后续 `83fbc30` 改用 `cmd /C` 和 `ping -n 3` 延迟执行 `start`。Rust `Command::args` 的 Windows 参数转义与 cmd 的解析规则不同，嵌套路径引号被错误处理，出现找不到反斜杠路径的提示；该实现还启动了终端辅助进程。
3. 本机实际安装的程序虽然标为 1.4.7，二进制仍包含 `ping -n 3 127.0.0.1`，不包含之后 `f9c9f65` 引入的 `POT_RESTART_EXE`。安装文件与工作区构建文件哈希不同，因此版本号相同并不能证明安装了修复。
4. `f9c9f65` 的 PowerShell 方案仍依赖固定等待 1500 ms，并忽略 `current_exe` / `spawn` 错误后直接退出当前应用。

## 本次实现

- 直接通过 `Command::new(current_exe)` 启动 Pot 自身，携带旧进程 PID；不调用 cmd、ping 或 PowerShell。
- 新进程在创建 Tauri builder 之前用 `OpenProcess(PROCESS_SYNCHRONIZE)` 和 `WaitForSingleObject` 等待旧进程退出，之后才初始化单实例锁、托盘、WebView、快捷键和服务。
- 旧进程已退出时允许正常启动；等待超过 30 秒或发生其他等待错误时提示错误并停止初始化。
- 只有成功创建替代进程才退出当前应用；启动失败时记录日志、提示错误并保留当前实例。
- 使用 `CREATE_NO_WINDOW` 和空标准输入输出，避免启动控制台。非 Windows 平台保留原来的 Tauri restart 行为。

API 依据：[Rust Command 的 Windows 参数说明](https://doc.rust-lang.org/std/process/struct.Command.html)、[Windows WaitForSingleObject](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject)。

## 验证（2026-09-29，Windows x64）

| 检查 | 结果 |
| --- | --- |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --bin pot` | 9 项通过；1 个子进程 fixture 在主测试中按需独立运行并通过 |
| `pnpm build` | 通过；已有 Browserslist / eval / 大 bundle 警告 |
| `node node_modules/@tauri-apps/cli/tauri.js build --bundles nsis -- --locked --offline` | release 编译及 NSIS 打包通过 |
| 旧进程模拟存活 8 秒 | 启动 2 秒后新进程仍在等待且没有初始化托盘；旧进程退出后正常启动 |
| 中文、空格、`& ( ) ' % !` 路径 | 10 次真实托盘事件重启通过 |
| 实际安装目录 `D:\Office Programs\pot-guling` | NSIS 安装退出码 0；安装后 10 次真实托盘事件重启通过 |
| 每次重启状态 | 旧 PID 退出，新 PID 使用同一可执行文件；一个托盘实例；60828 端口恢复；未检测到辅助 shell 或错误对话框 |
| 版本一致性 | package.json、tauri.conf.json、Cargo.toml、Cargo.lock 均为 1.4.7 |
| 安装文件一致性 | 安装后的 exe 与正式构建的 SHA-256 相同 |

桌面回归通过 `.scripts/test-windows-restart.py --cycles 10` 向真实托盘窗口发送菜单使用的 `WM_COMMAND`，走应用的托盘事件处理函数。需要 Windows 交互式桌面、运行中的 Pot 和 Python `psutil`。此测试会实际重启应用，不是对重启函数的模拟调用。测试范围为 Windows x64；未验证其他平台。

## 交付文件校验

- `pot-guling.exe`: `a88d1039704cc31387c64e0fee72030a9dc07932eff63f9ce2fdf0ecce042a19`
- `pot-guling_1.4.7_x64-setup.exe`: `1483b1ef726520795a8292979b4f285b01648badba5ab5cfff5e5df87109ab16`

本次保持 v1.4.7，替换此前同版本发布的安装包。其他已安装旧 v1.4.7 的机器需要重新下载安装；不能仅凭版本号判断是否包含修复。
