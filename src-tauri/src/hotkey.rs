use crate::config::{get, set};
use crate::window::{
    input_translate, input_translate_new_window, ocr_recognize, ocr_translate,
    ocr_translate_new_window, selection_translate, selection_translate_new_window,
};
use crate::APP;
use log::{info, warn};
use tauri::{AppHandle, GlobalShortcutManager};

const HOTKEY_NAMES: [&str; 7] = [
    "hotkey_selection_translate",
    "hotkey_input_translate",
    "hotkey_ocr_recognize",
    "hotkey_ocr_translate",
    "hotkey_selection_translate_new_window",
    "hotkey_input_translate_new_window",
    "hotkey_ocr_translate_new_window",
];

fn register<F>(
    app_handle: &AppHandle,
    name: &str,
    handler: F,
    key: &str,
    default_key: &str,
) -> Result<(), String>
where
    F: Fn() + Send + 'static,
{
    let hotkey = {
        if key.is_empty() {
            match get(name) {
                Some(v) => v.as_str().unwrap().to_string(),
                None => {
                    set(name, default_key);
                    default_key.to_string()
                }
            }
        } else {
            key.to_string()
        }
    };

    if !hotkey.is_empty() {
        match app_handle
            .global_shortcut_manager()
            .register(hotkey.as_str(), handler)
        {
            Ok(()) => {
                info!("Registered global shortcut: {} for {}", hotkey, name);
            }
            Err(e) => {
                warn!("Failed to register global shortcut: {} {:?}", hotkey, e);
                return Err(e.to_string());
            }
        };
    }
    Ok(())
}

fn register_by_name(app_handle: &AppHandle, name: &str, key: &str) -> Result<(), String> {
    let handler: fn() = match name {
        "hotkey_selection_translate" => selection_translate,
        "hotkey_selection_translate_new_window" => selection_translate_new_window,
        "hotkey_input_translate" => input_translate,
        "hotkey_input_translate_new_window" => input_translate_new_window,
        "hotkey_ocr_recognize" => ocr_recognize,
        "hotkey_ocr_translate" => ocr_translate,
        "hotkey_ocr_translate_new_window" => ocr_translate_new_window,
        _ => return Err(format!("Unknown shortcut: {name}")),
    };
    let default_key = match name {
        "hotkey_selection_translate_new_window" => "Ctrl+Shift+]",
        _ => "",
    };
    register(app_handle, name, handler, key, default_key)
}

// Register global shortcuts
pub fn register_shortcut(shortcut: &str) -> Result<(), String> {
    let app_handle = APP.get().unwrap();
    if shortcut == "all" {
        for name in HOTKEY_NAMES {
            register_by_name(app_handle, name, "")?;
        }
    } else {
        register_by_name(app_handle, shortcut, "")?;
    }
    Ok(())
}

#[tauri::command]
pub fn register_shortcut_by_frontend(name: &str, shortcut: &str) -> Result<(), String> {
    let app_handle = APP.get().unwrap();
    register_by_name(app_handle, name, shortcut)
}
