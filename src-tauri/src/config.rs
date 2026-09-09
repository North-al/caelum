use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppSettings {
    theme_mode: String,
    theme_color: String,
    pub(crate) editor_font_size: u32,
    editor_font_family: String,
    show_line_numbers: bool,
    word_wrap: bool,
    pub(crate) tab_size: u32,
    code_highlight: bool,
    #[serde(default = "default_code_highlight_theme")]
    code_highlight_theme: String,
    #[serde(default = "default_code_block_line_numbers")]
    code_block_line_numbers: bool,
    #[serde(default = "default_mermaid_theme")]
    mermaid_theme: String,
    auto_save: bool,
    pub(crate) auto_save_interval: u32,
    start_with_last_file: bool,
    #[serde(default = "default_scroll_sync")]
    scroll_sync: bool,
    #[serde(default = "default_confirm_invalid_extension")]
    confirm_invalid_extension: bool,
    language: String,
    #[serde(default = "default_scratch_hotkey")]
    pub(crate) scratch_hotkey: String,
}

fn default_scroll_sync() -> bool {
    true
}

fn default_confirm_invalid_extension() -> bool {
    true
}

fn default_code_highlight_theme() -> String {
    "auto".to_string()
}

fn default_code_block_line_numbers() -> bool {
    true
}

fn default_mermaid_theme() -> String {
    "auto".to_string()
}

pub(crate) fn default_scratch_hotkey() -> String {
    "Ctrl+Alt+N".to_string()
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
            code_highlight: true,
            code_highlight_theme: "auto".to_string(),
            code_block_line_numbers: true,
            mermaid_theme: "auto".to_string(),
            auto_save: true,
            auto_save_interval: 600,
            start_with_last_file: true,
            scroll_sync: true,
            confirm_invalid_extension: true,
            language: "zh-CN".to_string(),
            scratch_hotkey: default_scratch_hotkey(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceUiState {
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
    #[serde(default = "default_split_orientation")]
    split_orientation: String,
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
    "editor".to_string()
}

fn default_last_view_mode() -> String {
    "editor".to_string()
}

fn default_split_ratio() -> f64 {
    50.0
}

fn default_split_orientation() -> String {
    "horizontal".to_string()
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

const MIN_WINDOW_WIDTH: f64 = 900.0;
const MIN_WINDOW_HEIGHT: f64 = 560.0;
const MAX_WINDOW_WIDTH: f64 = 6000.0;
const MAX_WINDOW_HEIGHT: f64 = 4000.0;

/// Remembered main-window size from config, clamped to sane bounds.
pub(crate) fn remembered_window_size() -> (f64, f64) {
    let (raw_width, raw_height) = match fs::read_to_string(config_file_path())
        .ok()
        .and_then(|content| serde_json::from_str::<WorkspaceConfig>(&content).ok())
    {
        Some(config) => (config.ui_state.window_width, config.ui_state.window_height),
        None => (default_window_width(), default_window_height()),
    };

    let width = if !raw_width.is_finite() || raw_width < MIN_WINDOW_WIDTH {
        default_window_width()
    } else {
        raw_width.min(MAX_WINDOW_WIDTH).round()
    };
    let height = if !raw_height.is_finite() || raw_height < MIN_WINDOW_HEIGHT {
        default_window_height()
    } else {
        raw_height.min(MAX_WINDOW_HEIGHT).round()
    };
    (width, height)
}

impl Default for WorkspaceUiState {
    fn default() -> Self {
        Self {
            default_open_mode: default_open_mode(),
            last_view_mode: default_last_view_mode(),
            active_file_path: None,
            open_files: Vec::new(),
            split_ratio: default_split_ratio(),
            split_orientation: default_split_orientation(),
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
pub(crate) struct WorkspaceConfig {
    pub(crate) notes_path: String,
    pub(crate) assets_path: String,
    workspace_name: String,
    recent_files: Vec<String>,
    #[serde(default)]
    pub(crate) settings: AppSettings,
    #[serde(default)]
    ui_state: WorkspaceUiState,
}

#[derive(Debug, Serialize)]
pub(crate) struct WorkspacePaths {
    pub(crate) notes_path: String,
    pub(crate) assets_path: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct FileEntry {
    pub(crate) id: String,
    pub(crate) name: String,
    #[serde(rename = "type")]
    pub(crate) r#type: String,
    pub(crate) path: String,
    pub(crate) children: Vec<FileEntry>,
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

pub(crate) fn default_workspace_paths() -> WorkspacePaths {
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

pub(crate) fn config_file_path() -> PathBuf {
    let config_dir = directories::BaseDirs::new()
        .map(|base_dirs| base_dirs.config_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from(".").join(".config"));
    config_dir.join("caelum").join("config.json")
}

fn get_config_file_path() -> String {
    config_file_path().to_string_lossy().replace('\\', "/")
}

fn ensure_workspace_directories(config: &WorkspaceConfig) -> Result<(), String> {
    fs::create_dir_all(Path::new(&config.notes_path)).map_err(|error| error.to_string())?;
    fs::create_dir_all(Path::new(&config.assets_path)).map_err(|error| error.to_string())?;
    Ok(())
}

fn seed_example_note_if_empty(config: &WorkspaceConfig) -> Result<(), String> {
    let notes_dir = Path::new(&config.notes_path);
    let notes_empty = fs::read_dir(notes_dir)
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(true);

    if notes_empty {
        let math_guide = include_str!("../seed/math-guide.md");
        let mermaid_guide = include_str!("../seed/mermaid-guide.md");
        fs::write(notes_dir.join("数学公式入门.md"), math_guide)
            .map_err(|error| error.to_string())?;
        fs::write(notes_dir.join("Mermaid图表入门.md"), mermaid_guide)
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

#[tauri::command]
pub fn get_default_workspace_paths() -> Result<WorkspacePaths, String> {
    Ok(default_workspace_paths())
}

#[tauri::command]
pub fn get_app_paths() -> Result<serde_json::Value, String> {
    let defaults = default_workspace_paths();
    Ok(serde_json::json!({
        "configPath": get_config_file_path(),
        "defaultNotesPath": defaults.notes_path.replace('\\', "/"),
        "defaultAssetsPath": defaults.assets_path.replace('\\', "/"),
    }))
}

#[tauri::command]
pub fn load_workspace_config() -> Result<WorkspaceConfig, String> {
    let config_path = config_file_path();
    let is_new_config = !config_path.exists();
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

    ensure_workspace_directories(&config)?;
    if is_new_config {
        seed_example_note_if_empty(&config)?;
    }
    save_workspace_config_file(&config)?;
    Ok(config)
}

#[tauri::command]
pub fn save_workspace_config(config: WorkspaceConfig) -> Result<WorkspaceConfig, String> {
    ensure_workspace_directories(&config)?;
    save_workspace_config_file(&config)?;
    Ok(config)
}
