use std::fs;
use std::sync::Mutex;

use crate::config::{config_file_path, default_scratch_hotkey, WorkspaceConfig};

pub struct ScratchHotkeyState {
    pub(crate) current: Mutex<String>,
}

fn to_accelerator(display: &str) -> String {
    display
        .split('+')
        .map(|part| {
            let trimmed = part.trim().to_ascii_lowercase();
            match trimmed.as_str() {
                "control" | "ctrl" | "⌘" | "cmd" | "command" => "ctrl".to_string(),
                "option" | "alt" | "⌥" => "alt".to_string(),
                "shift" | "⇧" => "shift".to_string(),
                "meta" | "win" | "windows" | "super" => "super".to_string(),
                other => other.to_string(),
            }
        })
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

fn display_hotkey(accelerator: &str) -> String {
    accelerator
        .split('+')
        .map(|part| {
            let trimmed = part.trim().to_ascii_lowercase();
            match trimmed.as_str() {
                "ctrl" | "control" => "Ctrl".to_string(),
                "alt" | "option" => "Alt".to_string(),
                "shift" => "Shift".to_string(),
                "super" | "meta" | "win" => "Win".to_string(),
                other if other.len() == 1 => other.to_ascii_uppercase(),
                other => {
                    let mut chars = other.chars();
                    match chars.next() {
                        Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
                        None => String::new(),
                    }
                }
            }
        })
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

pub(crate) fn load_scratch_hotkey_preference() -> String {
    let config_path = config_file_path();
    if !config_path.exists() {
        return default_scratch_hotkey();
    }
    let Ok(content) = fs::read_to_string(&config_path) else {
        return default_scratch_hotkey();
    };
    let Ok(config) = serde_json::from_str::<WorkspaceConfig>(&content) else {
        return default_scratch_hotkey();
    };
    let hotkey = config.settings.scratch_hotkey.trim();
    if hotkey.is_empty() {
        default_scratch_hotkey()
    } else {
        display_hotkey(&to_accelerator(hotkey))
    }
}

#[cfg(desktop)]
pub(crate) fn register_scratch_hotkey(app: &tauri::AppHandle, display: &str) -> Result<String, String> {
    use tauri::Manager;
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    let accelerator = to_accelerator(display);
    if accelerator.is_empty() {
        return Err("快捷键不能为空".to_string());
    }

    let state = app.state::<ScratchHotkeyState>();
    let previous = state
        .current
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();

    if !previous.is_empty() && previous != accelerator {
        let _ = app.global_shortcut().unregister(previous.as_str());
    }

    let result = app.global_shortcut().on_shortcut(accelerator.as_str(), move |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let app = app.clone();
            let _ = std::thread::Builder::new()
                .name("caelum-scratch-hotkey".into())
                .spawn(move || {
                    if let Err(error) = crate::scratch::toggle_scratch_capture(&app) {
                        eprintln!("scratch capture: {error}");
                    }
                });
        }
    });

    if let Err(error) = result {
        if !previous.is_empty() && previous != accelerator {
            let _ = app.global_shortcut().on_shortcut(previous.as_str(), move |app, _, event| {
                if event.state == ShortcutState::Pressed {
                    let app = app.clone();
                    let _ = std::thread::Builder::new()
                        .name("caelum-scratch-hotkey".into())
                        .spawn(move || {
                            let _ = crate::scratch::toggle_scratch_capture(&app);
                        });
                }
            });
        }
        return Err(format!("无法注册快捷键 {accelerator}：{error}"));
    }

    *state
        .current
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = accelerator.clone();

    Ok(display_hotkey(&accelerator))
}

#[tauri::command]
pub fn set_scratch_hotkey(app: tauri::AppHandle, shortcut: String) -> Result<String, String> {
    #[cfg(desktop)]
    {
        register_scratch_hotkey(&app, &shortcut)
    }
    #[cfg(not(desktop))]
    {
        let _ = (app, shortcut);
        Err("当前平台不支持全局快捷键".to_string())
    }
}

#[tauri::command]
pub fn get_scratch_hotkey(app: tauri::AppHandle) -> String {
    use tauri::Manager;
    let state = app.state::<ScratchHotkeyState>();
    let current = state
        .current
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();
    if current.is_empty() {
        default_scratch_hotkey()
    } else {
        display_hotkey(&current)
    }
}
