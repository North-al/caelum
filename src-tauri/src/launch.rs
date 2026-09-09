use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{AppHandle, LogicalSize, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::config::remembered_window_size;
use crate::fs_ops::is_openable_note_path;

/// Launch file paths captured once at process start. First command call takes them;
/// subsequent calls return an empty list (CLI args are only meaningful on cold start).
static LAUNCH_FILE_PATHS: Mutex<Option<Vec<String>>> = Mutex::new(None);

pub(crate) fn ensure_launch_paths_cached() {
    let mut guard = LAUNCH_FILE_PATHS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if guard.is_none() {
        let args: Vec<String> = std::env::args().collect();
        *guard = Some(collect_openable_paths(&args));
    }
}

pub(crate) fn collect_openable_paths(args: &[String]) -> Vec<String> {
    args.iter()
        .skip(1)
        .filter(|argument| !argument.starts_with('-'))
        .filter(|argument| is_openable_note_path(argument))
        .map(|argument| {
            let resolved = PathBuf::from(argument)
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(argument));
            let mut path = resolved.to_string_lossy().into_owned();
            if let Some(stripped) = path.strip_prefix(r"\\?\") {
                path = stripped.to_string();
            }
            path.replace('\\', "/")
        })
        .collect()
}

/// Paths passed via CLI / file association (e.g. double-click a .md file).
/// Consumed on first read so remounting the frontend does not reopen the same files.
#[tauri::command]
pub fn get_launch_file_paths() -> Vec<String> {
    ensure_launch_paths_cached();
    let mut guard = LAUNCH_FILE_PATHS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    guard.take().unwrap_or_default()
}

/// Apply remembered size then show the main window (started with visible=false).
pub(crate) fn reveal_main_window(app: &AppHandle) {
    let (width, height) = remembered_window_size();
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(LogicalSize::new(width, height));
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub(crate) fn show_or_create_main_window(app: &AppHandle) {
    let (width, height) = remembered_window_size();

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_size(LogicalSize::new(width, height));
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Caelum")
        .inner_size(width, height)
        .min_inner_size(900.0, 560.0)
        .decorations(false)
        .visible(true)
        .focused(true);

    if let Err(error) = builder.build() {
        eprintln!("failed to recreate main window: {error}");
    }
}
