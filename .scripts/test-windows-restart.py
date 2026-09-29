"""Exercise the real Windows tray handler in a release build (requires psutil).

Run on an interactive desktop with Pot already running:
  python .scripts/test-windows-restart.py --cycles 10
The test sends the same WM_COMMAND as the tray menu, verifies PID replacement,
one initialized tray instance and HTTP service recovery, and watches for shells
or error dialogs. --quit closes Pot through its ordinary tray handler.
"""
import argparse
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import socket
import time

import psutil

user32 = ctypes.WinDLL("user32", use_last_error=True)
callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
user32.EnumWindows.argtypes = [callback_type, wintypes.LPARAM]
user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.PostMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]

# Tauri 1.x CustomMenuItem hashes string IDs using Rust DefaultHasher, then u16.
# Verified against tauri-runtime 0.14.5/src/menu.rs and the installed Rust toolchain.
MENU_IDS = {"restart": 61360, "quit": 61672, "config": 43365}


def windows():
    result = []

    @callback_type
    def visit(hwnd, _):
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        cls, title = ctypes.create_unicode_buffer(256), ctypes.create_unicode_buffer(1024)
        user32.GetClassNameW(hwnd, cls, len(cls))
        user32.GetWindowTextW(hwnd, title, len(title))
        result.append((hwnd, pid.value, cls.value, title.value, bool(user32.IsWindowVisible(hwnd))))
        return True

    user32.EnumWindows(visit, 0)
    return result


def trays():
    return [w for w in windows() if w[2] == "tao_system_tray_app" and
            psutil.Process(w[1]).name().lower() in ("pot.exe", "pot-guling.exe")]


def command(item):
    found = trays()
    assert len(found) == 1, f"Expected one Pot tray, got {found}"
    assert user32.PostMessageW(found[0][0], 0x111, MENU_IDS[item], 0), ctypes.get_last_error()
    return found[0][1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cycles", type=int, default=1)
    parser.add_argument("--quit", action="store_true")
    parser.add_argument("--inspect", action="store_true")
    args = parser.parse_args()
    if args.inspect:
        print(json.dumps(trays(), ensure_ascii=False))
        return
    if args.quit:
        pid = command("quit")
        psutil.Process(pid).wait(10)
        print(f"Pot {pid} exited through tray handler")
        return

    config = json.loads((Path(os.environ["APPDATA"]) / "com.guling.pot/config.json").read_text("utf-8"))
    port = config.get("server_port", 60828)
    for cycle in range(args.cycles):
        original = trays()
        assert len(original) == 1, original
        old_pid = original[0][1]
        exe = psutil.Process(old_pid).exe()
        baseline = set(psutil.pids())
        start = time.monotonic()
        command("restart")
        new_pid = None
        stable_since = None
        while time.monotonic() - start < 20:
            for process in psutil.process_iter(["pid", "ppid", "name"]):
                if process.pid not in baseline and process.info["ppid"] in (old_pid, new_pid):
                    assert process.info["name"].lower() not in (
                        "cmd.exe", "powershell.exe", "pwsh.exe", "ping.exe", "conhost.exe", "windowsterminal.exe"
                    ), f"Unexpected restart helper: {process.info}"
            current = trays()
            ready = len(current) == 1 and current[0][1] != old_pid and not psutil.pid_exists(old_pid)
            if ready:
                new_pid = current[0][1]
                assert psutil.Process(new_pid).exe() == exe, "Restarted a different executable"
                errors = [w for w in windows() if w[1] == new_pid and w[2] == "#32770" and w[4]]
                assert not errors, f"Error dialog: {errors}"
                try:
                    with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                        pass
                except OSError:
                    ready = False
            if ready:
                stable_since = stable_since or time.monotonic()
                if time.monotonic() - stable_since >= 1:
                    print(json.dumps({"cycle": cycle + 1, "old_pid": old_pid, "new_pid": new_pid,
                                      "seconds": round(time.monotonic() - start, 2), "exe": exe,
                                      "tray_count": len(current), "server_port": port}), flush=True)
                    break
            else:
                stable_since = None
            time.sleep(0.03)
        else:
            raise AssertionError(f"Restart timed out; tray windows: {trays()}")


if __name__ == "__main__":
    main()
