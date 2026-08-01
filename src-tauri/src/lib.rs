use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
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
    language: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct WorkspaceUiState {
    default_open_mode: String,
    last_view_mode: String,
    active_file_path: Option<String>,
    open_files: Vec<String>,
    split_ratio: f64,
    reading_positions: std::collections::HashMap<String, serde_json::Value>,
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
            settings: AppSettings {
                theme_mode: "system".to_string(),
                theme_color: "blue".to_string(),
                editor_font_size: 14,
                editor_font_family: "Inter Variable".to_string(),
                show_line_numbers: true,
                word_wrap: true,
                tab_size: 2,
                live_preview: true,
                code_highlight: true,
                auto_save: true,
                auto_save_interval: 600,
                start_with_last_file: true,
                language: "zh-CN".to_string(),
            },
            ui_state: WorkspaceUiState {
                default_open_mode: "preview".to_string(),
                last_view_mode: "preview".to_string(),
                active_file_path: None,
                open_files: Vec::new(),
                split_ratio: 50.0,
                reading_positions: std::collections::HashMap::new(),
            },
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
    let pictures_dir = directories::UserDirs::new()
        .and_then(|user_dirs| user_dirs.picture_dir().map(Path::to_path_buf))
        .unwrap_or_else(|| home_dir.join("Pictures"));

    WorkspacePaths {
        notes_path: documents_dir.join("caelum").join("notes").to_string_lossy().into_owned(),
        assets_path: pictures_dir.join("caelum").join("assets").to_string_lossy().into_owned(),
    }
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
    let config = if config_path.exists() {
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
            move_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
