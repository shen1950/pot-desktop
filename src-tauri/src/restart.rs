//! Windows restart handoff. The replacement waits before acquiring the single-instance lock.
use std::ffi::OsString;
use std::io;
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use windows::Win32::Foundation::{ERROR_INVALID_PARAMETER, HANDLE, WAIT_OBJECT_0, WAIT_TIMEOUT};
use windows::Win32::System::Threading::{OpenProcess, WaitForSingleObject, PROCESS_SYNCHRONIZE};

const RESTART_FLAG: &str = "--pot-restart-parent";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn parent_pid(mut args: impl Iterator<Item = OsString>) -> io::Result<Option<u32>> {
    if args.next().as_deref() != Some(std::ffi::OsStr::new(RESTART_FLAG)) {
        return Ok(None);
    }
    let pid = args
        .next()
        .and_then(|arg| arg.to_str().and_then(|value| value.parse::<u32>().ok()))
        .filter(|pid| *pid != 0 && *pid != std::process::id());
    pid.map(Some)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid restart parent PID"))
}

fn wait_for_parent(pid: u32, timeout_ms: u32) -> io::Result<()> {
    // The parent can finish exiting before the replacement reaches OpenProcess.
    let handle = match unsafe { OpenProcess(PROCESS_SYNCHRONIZE, false, pid) } {
        Ok(handle) => unsafe { OwnedHandle::from_raw_handle(handle.0) },
        Err(error) if error.code() == ERROR_INVALID_PARAMETER.to_hresult() => return Ok(()),
        Err(error) => return Err(io::Error::other(error)),
    };
    // Keeping the handle open identifies this process even if Windows later reuses its PID.
    match unsafe { WaitForSingleObject(HANDLE(handle.as_raw_handle()), timeout_ms) } {
        WAIT_OBJECT_0 => Ok(()),
        WAIT_TIMEOUT => Err(io::Error::new(
            io::ErrorKind::TimedOut,
            "The previous Pot process did not exit within the restart timeout",
        )),
        _ => Err(io::Error::last_os_error()),
    }
}

pub fn wait_for_restart_parent() -> io::Result<()> {
    if let Some(pid) = parent_pid(std::env::args_os().skip(1))? {
        wait_for_parent(pid, 30_000)?;
    }
    Ok(())
}

fn spawn_replacement(exe: &Path) -> io::Result<Child> {
    // Pass the executable directly to CreateProcess through Command. No shell, quoting
    // language, PATH lookup, or fixed sleep is involved, including for spaced/Unicode paths.
    Command::new(exe)
        .arg(RESTART_FLAG)
        .arg(std::process::id().to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
}

pub fn launch_replacement() -> io::Result<()> {
    spawn_replacement(&std::env::current_exe()?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str]) -> io::Result<Option<u32>> {
        parent_pid(args.iter().map(OsString::from))
    }

    #[test]
    fn ordinary_launch_does_not_wait() {
        assert_eq!(parse(&[]).unwrap(), None);
        assert_eq!(parse(&["--other-option"]).unwrap(), None);
    }

    #[test]
    fn restart_pid_is_validated() {
        assert_eq!(parse(&[RESTART_FLAG, "123"]).unwrap(), Some(123));
        for args in [
            vec![RESTART_FLAG],
            vec![RESTART_FLAG, "0"],
            vec![RESTART_FLAG, "abc"],
        ] {
            assert!(parse(&args).is_err());
        }
        assert!(parse(&[RESTART_FLAG, &std::process::id().to_string()]).is_err());
    }

    #[test]
    fn live_parent_times_out_instead_of_initializing_another_instance() {
        let error = wait_for_parent(std::process::id(), 10).unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::TimedOut);
    }

    #[test]
    fn missing_executable_reports_failure() {
        assert!(spawn_replacement(Path::new(r"Z:\nonexistent-pot-restart-test\pot.exe")).is_err());
    }

    #[test]
    fn waits_until_process_exits() {
        let mut child = Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "restart::tests::delayed_exit_fixture",
                "--ignored",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .unwrap();
        assert_eq!(
            wait_for_parent(child.id(), 10).unwrap_err().kind(),
            io::ErrorKind::TimedOut
        );
        wait_for_parent(child.id(), 10_000).unwrap();
        assert!(child.wait().unwrap().success());
        // Also exercise the handoff where the old process has already exited.
        let pid = child.id();
        drop(child);
        wait_for_parent(pid, 100).unwrap();
    }

    #[test]
    #[ignore = "subprocess fixture for waits_until_process_exits"]
    fn delayed_exit_fixture() {
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
}
