mod clipboard;
mod config;
mod fs_ops;
mod hotkey;
mod launch;
mod scratch;

use std::sync::Mutex;

use hotkey::ScratchHotkeyState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::{Emitter, Manager, WindowEvent};

    tauri::Builder::default()
        .manage(ScratchHotkeyState {
            current: Mutex::new(String::new()),
        })
        .setup(|app| {
            launch::ensure_launch_paths_cached();
            app.manage(scratch::ScratchManager::load());

            #[cfg(desktop)]
            {
                if let Err(error) = app
                    .handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
                {
                    eprintln!("failed to init global shortcut plugin: {error}");
                } else {
                    let preferred = hotkey::load_scratch_hotkey_preference();
                    if let Err(error) = hotkey::register_scratch_hotkey(app.handle(), &preferred) {
                        eprintln!("global shortcut unavailable: {error}");
                    }
                }
            }

            // Size before first paint so loading doesn't flash the default 1200×760 window.
            launch::reveal_main_window(app.handle());

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed = event {
                scratch::destroy_all_scratch_windows(window.app_handle());
            }
        })
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let paths = launch::collect_openable_paths(&argv);
            let _ = app.emit("open-files", paths);
            launch::show_or_create_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            config::get_default_workspace_paths,
            config::get_app_paths,
            config::load_workspace_config,
            config::save_workspace_config,
            fs_ops::list_notes_tree,
            fs_ops::read_text_file,
            fs_ops::write_text_file,
            fs_ops::create_file_entry,
            fs_ops::create_folder_entry,
            fs_ops::rename_entry,
            fs_ops::delete_entry,
            fs_ops::move_entry,
            fs_ops::copy_file_entry,
            fs_ops::copy_file_to_path,
            fs_ops::write_binary_file,
            fs_ops::path_exists,
            clipboard::get_clipboard_file_paths,
            clipboard::set_clipboard_file_paths,
            clipboard::clipboard_read_text,
            clipboard::clipboard_write_text,
            clipboard::clipboard_read_image,
            clipboard::clipboard_write_image,
            launch::get_launch_file_paths,
            hotkey::set_scratch_hotkey,
            hotkey::get_scratch_hotkey,
            scratch::load_scratch_store,
            scratch::upsert_scratch_note,
            scratch::patch_scratch_note,
            scratch::create_scratch_note,
            scratch::delete_scratch_note,
            scratch::close_scratch_window,
            scratch::dismiss_scratch_window,
            scratch::destroy_scratch_window,
            scratch::open_scratch_window,
            scratch::toggle_scratch_capture_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
