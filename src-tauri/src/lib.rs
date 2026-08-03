use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    theme_mode: String,
    theme_color: String,
    editor_font_size: u32,
    editor_font_family: String,
    show_line_numbers: bool,
    word_wrap: bool,
    tab_size: u32,
    live_preview: bool,
    code_highlight: bool,
    auto_save: bool,
    auto_save_interval: u32,
    start_with_last_file: bool,
    #[serde(default)]
    scroll_sync: bool,
    language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme_mode: "system".to_string(),
            theme_color: "blue".to_string(),
            editor_font_size: 14,
            editor_font_family: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace".to_string(),
            show_line_numbers: true,
            word_wrap: true,
            tab_size: 2,
            live_preview: true,
            code_highlight: true,
            auto_save: true,
            auto_save_interval: 600,
            start_with_last_file: true,
            scroll_sync: false,
            language: "zh-CN".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceUiState {
    #[serde(default = "default_open_mode")]
    default_open_mode: String,
    #[serde(default = "default_last_view_mode")]
    last_view_mode: String,
    #[serde(default)]
    active_file_path: Option<String>,
    #[serde(default)]
    open_files: Vec<String>,
    #[serde(default = "default_split_ratio")]
    split_ratio: f64,
    #[serde(default)]
    reading_positions: std::collections::HashMap<String, serde_json::Value>,
    #[serde(default)]
    sidebar_collapsed: bool,
    #[serde(default)]
    outline_visible: bool,
    #[serde(default = "default_outline_width")]
    outline_width: f64,
    #[serde(default = "default_window_width")]
    window_width: f64,
    #[serde(default = "default_window_height")]
    window_height: f64,
}

fn default_open_mode() -> String {
    "preview".to_string()
}

fn default_last_view_mode() -> String {
    "preview".to_string()
}

fn default_split_ratio() -> f64 {
    50.0
}

fn default_outline_width() -> f64 {
    250.0
}

fn default_window_width() -> f64 {
    1200.0
}

fn default_window_height() -> f64 {
    760.0
}

impl Default for WorkspaceUiState {
    fn default() -> Self {
        Self {
            default_open_mode: default_open_mode(),
            last_view_mode: default_last_view_mode(),
            active_file_path: None,
            open_files: Vec::new(),
            split_ratio: default_split_ratio(),
            reading_positions: std::collections::HashMap::new(),
            sidebar_collapsed: false,
            outline_visible: false,
            outline_width: default_outline_width(),
            window_width: default_window_width(),
            window_height: default_window_height(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceConfig {
    notes_path: String,
    assets_path: String,
    workspace_name: String,
    recent_files: Vec<String>,
    #[serde(default)]
    settings: AppSettings,
    #[serde(default)]
    ui_state: WorkspaceUiState,
}

#[derive(Debug, Serialize)]
struct WorkspacePaths {
    notes_path: String,
    assets_path: String,
}

#[derive(Debug, Serialize)]
struct FileEntry {
    id: String,
    name: String,
    #[serde(rename = "type")]
    r#type: String,
    path: String,
    children: Vec<FileEntry>,
}

impl Default for WorkspaceConfig {
    fn default() -> Self {
        let paths = default_workspace_paths();
        Self {
            notes_path: paths.notes_path,
            assets_path: paths.assets_path,
            workspace_name: "Caelum".to_string(),
            recent_files: Vec::new(),
            settings: AppSettings::default(),
            ui_state: WorkspaceUiState::default(),
        }
    }
}

fn default_workspace_paths() -> WorkspacePaths {
    let home_dir = directories::BaseDirs::new()
        .map(|base_dirs| base_dirs.home_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    let documents_dir = directories::UserDirs::new()
        .and_then(|user_dirs| user_dirs.document_dir().map(Path::to_path_buf))
        .unwrap_or_else(|| home_dir.join("Documents"));
    let caelum_root = documents_dir.join("caelum");

    WorkspacePaths {
        notes_path: caelum_root.join("notes").to_string_lossy().into_owned(),
        assets_path: caelum_root.join("assets").to_string_lossy().into_owned(),
    }
}

fn allocate_unique_path(dir: &Path, file_name: &str) -> PathBuf {
    let candidate = dir.join(file_name);
    if !candidate.exists() {
        return candidate;
    }

    let path = Path::new(file_name);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("file");
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("");

    for index in 1..10_000 {
        let next_name = if extension.is_empty() {
            format!("{stem} ({index})")
        } else {
            format!("{stem} ({index}).{extension}")
        };
        let next_path = dir.join(next_name);
        if !next_path.exists() {
            return next_path;
        }
    }

    dir.join(format!("{stem}-{}.{}", std::process::id(), extension))
}

fn config_file_path() -> PathBuf {
    let config_dir = directories::BaseDirs::new()
        .map(|base_dirs| base_dirs.config_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from(".").join(".config"));
    config_dir.join("caelum").join("config.json")
}

fn ensure_parent_directory(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn ensure_workspace_layout(config: &WorkspaceConfig) -> Result<(), String> {
    let notes_dir = Path::new(&config.notes_path);
    let assets_dir = Path::new(&config.assets_path);

    fs::create_dir_all(notes_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(assets_dir).map_err(|error| error.to_string())?;

    let example_file = notes_dir.join("example.md");
    if !example_file.exists() {
        fs::write(
            &example_file,
            "# Welcome to Caelum\n\nStart writing in your local workspace.\n",
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn save_workspace_config_file(config: &WorkspaceConfig) -> Result<(), String> {
    let file_path = config_file_path();
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let content = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    fs::write(file_path, content).map_err(|error| error.to_string())?;
    Ok(())
}

fn build_tree(path: &Path) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let directory = fs::read_dir(path).map_err(|error| error.to_string())?;

    for item in directory {
        let entry = item.map_err(|error| error.to_string())?;
        let entry_path = entry.path();
        let file_type = entry.file_type().map_err(|error| error.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        if file_type.is_dir() {
            entries.push(FileEntry {
                id: entry_path.to_string_lossy().into_owned(),
                name: name.clone(),
                r#type: "folder".to_string(),
                path: entry_path.to_string_lossy().into_owned(),
                children: build_tree(&entry_path)?,
            })
        } else if file_type.is_file() {
            let extension = entry_path
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_lowercase();

            if extension == "md" || extension == "txt" {
                entries.push(FileEntry {
                    id: entry_path.to_string_lossy().into_owned(),
                    name,
                    r#type: "file".to_string(),
                    path: entry_path.to_string_lossy().into_owned(),
                    children: Vec::new(),
                })
            }
        }
    }

    entries.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
fn get_default_workspace_paths() -> Result<WorkspacePaths, String> {
    Ok(default_workspace_paths())
}

#[tauri::command]
fn load_workspace_config() -> Result<WorkspaceConfig, String> {
    let config_path = config_file_path();
    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|error| error.to_string())?;
        let mut config: WorkspaceConfig = serde_json::from_str(&content).map_err(|error| error.to_string())?;
        if config.notes_path.is_empty() || config.assets_path.is_empty() {
            let default_paths = default_workspace_paths();
            config.notes_path = default_paths.notes_path;
            config.assets_path = default_paths.assets_path;
        }
        config
    } else {
        WorkspaceConfig::default()
    };

    if config.settings.editor_font_size == 0 {
        config.settings.editor_font_size = 14;
    }
    if config.settings.tab_size == 0 {
        config.settings.tab_size = 2;
    }
    if config.settings.auto_save_interval == 0 {
        config.settings.auto_save_interval = 600;
    }

    ensure_workspace_layout(&config)?;
    save_workspace_config_file(&config)?;
    Ok(config)
}

#[tauri::command]
fn save_workspace_config(config: WorkspaceConfig) -> Result<WorkspaceConfig, String> {
    ensure_workspace_layout(&config)?;
    save_workspace_config_file(&config)?;
    Ok(config)
}

#[tauri::command]
fn list_notes_tree(path: String) -> Result<Vec<FileEntry>, String> {
    let root_path = PathBuf::from(path);
    if !root_path.exists() {
        return Ok(Vec::new());
    }

    build_tree(&root_path)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(path);
    ensure_parent_directory(&file_path)?;
    fs::write(file_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_file_entry(path: String) -> Result<(), String> {
    let file_path = PathBuf::from(path);
    if file_path.exists() {
        return Err("File already exists".to_string());
    }
    ensure_parent_directory(&file_path)?;
    fs::write(file_path, "").map_err(|error| error.to_string())
}

#[tauri::command]
fn create_folder_entry(path: String) -> Result<(), String> {
    let folder_path = PathBuf::from(path);
    if folder_path.exists() {
        return Err("Folder already exists".to_string());
    }
    fs::create_dir_all(folder_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_entry(path: String) -> Result<(), String> {
    let entry_path = PathBuf::from(path);
    if entry_path.is_dir() {
        fs::remove_dir_all(entry_path).map_err(|error| error.to_string())
    } else {
        fs::remove_file(entry_path).map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn move_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn copy_file_entry(source: String, destination_dir: String) -> Result<String, String> {
    let source_path = PathBuf::from(&source);
    if !source_path.is_file() {
        return Err("Source is not a file".to_string());
    }

    let dest_dir = PathBuf::from(&destination_dir);
    fs::create_dir_all(&dest_dir).map_err(|error| error.to_string())?;

    let file_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Invalid source file name".to_string())?;
    let destination = allocate_unique_path(&dest_dir, file_name);
    fs::copy(&source_path, &destination).map_err(|error| error.to_string())?;
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn copy_file_to_path(source: String, destination: String) -> Result<(), String> {
    let destination_path = PathBuf::from(&destination);
    ensure_parent_directory(&destination_path)?;
    fs::copy(source, destination_path).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    let file_path = PathBuf::from(path);
    ensure_parent_directory(&file_path)?;
    fs::write(file_path, contents).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_default_workspace_paths,
            load_workspace_config,
            save_workspace_config,
            list_notes_tree,
            read_text_file,
            write_text_file,
            create_file_entry,
            create_folder_entry,
            rename_entry,
            delete_entry,
            move_entry,
            copy_file_entry,
            copy_file_to_path,
            write_binary_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
