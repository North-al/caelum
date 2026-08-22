use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    window::Color,
};

const PRESETS: [&str; 5] = [
    "caelum",
    "frost-glass",
    "neon-tech",
    "parchment",
    "aurora",
];
const DEFAULT_WINDOW_WIDTH: f64 = 420.0;
const DEFAULT_WINDOW_HEIGHT: f64 = 528.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScratchAppearance {
    #[serde(default = "default_preset")]
    pub preset: String,
    #[serde(default = "default_background")]
    pub background: String,
    #[serde(default = "default_opacity")]
    pub opacity: f64,
    #[serde(default)]
    pub blur: f64,
    #[serde(default = "default_border_color")]
    pub border_color: String,
    #[serde(default = "default_border_width")]
    pub border_width: f64,
    #[serde(default = "default_radius")]
    pub radius: f64,
    #[serde(default = "default_pin_color")]
    pub pin_color: String,
    #[serde(default = "default_pattern")]
    pub pattern: String,
    #[serde(default = "default_surface_id")]
    pub surface_id: String,
    /// Legacy field — ignored by frontend; kept for backward-compatible deserialization.
    #[serde(default)]
    pub border_style: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScratchNotePatch {
    pub id: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub appearance: Option<ScratchAppearance>,
    #[serde(default)]
    pub x: Option<f64>,
    #[serde(default)]
    pub y: Option<f64>,
    #[serde(default)]
    pub width: Option<f64>,
    #[serde(default)]
    pub height: Option<f64>,
    #[serde(default)]
    pub z_index: Option<i64>,
    #[serde(default)]
    pub always_on_top: Option<bool>,
    #[serde(default)]
    pub window_x: Option<f64>,
    #[serde(default)]
    pub window_y: Option<f64>,
    #[serde(default)]
    pub window_width: Option<f64>,
    #[serde(default)]
    pub window_height: Option<f64>,
    #[serde(default)]
    pub editor_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScratchNote {
    pub id: String,
    #[serde(default)]
    pub content: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default)]
    pub appearance: Option<ScratchAppearance>,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default = "default_width")]
    pub width: f64,
    #[serde(default = "default_height")]
    pub height: f64,
    #[serde(default)]
    pub z_index: i64,
    #[serde(default)]
    pub always_on_top: bool,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
    #[serde(default)]
    pub window_x: Option<f64>,
    #[serde(default)]
    pub window_y: Option<f64>,
    #[serde(default)]
    pub window_width: Option<f64>,
    #[serde(default)]
    pub window_height: Option<f64>,
    #[serde(default)]
    pub editor_mode: Option<String>,
}

fn default_status() -> String {
    "inbox".to_string()
}

fn default_color() -> String {
    "ivory".to_string()
}

fn default_width() -> f64 {
    236.0
}

fn default_height() -> f64 {
    248.0
}

fn default_preset() -> String {
    "caelum".to_string()
}

fn default_background() -> String {
    "#f4f7fc".to_string()
}

fn default_opacity() -> f64 {
    0.52
}

fn default_border_color() -> String {
    "#d5dde8".to_string()
}

fn default_border_width() -> f64 {
    1.0
}

fn default_radius() -> f64 {
    10.0
}

fn default_pin_color() -> String {
    "#5c84cc".to_string()
}

fn default_pattern() -> String {
    "plain".to_string()
}

fn default_surface_id() -> String {
    "none".to_string()
}

fn appearance_for_preset(preset: &str) -> ScratchAppearance {
    match preset {
        "caelum" | "glass" | "fog-lined" | "fog" | "glass-cyan" | "ivory" => ScratchAppearance {
            preset: "caelum".to_string(),
            background: "#f4f7fc".to_string(),
            opacity: 0.95,
            blur: 12.0,
            border_color: "#8ba8d8".to_string(),
            border_width: 0.0,
            radius: 10.0,
            pin_color: default_pin_color(),
            pattern: "plain".to_string(),
            surface_id: "caelum-mica".to_string(),
            border_style: None,
        },
        "frost-glass" => ScratchAppearance {
            preset: "frost-glass".to_string(),
            background: "#f0f6fc".to_string(),
            opacity: 0.95,
            blur: 32.0,
            border_color: "#b8d4ec".to_string(),
            border_width: 0.0,
            radius: 10.0,
            pin_color: default_pin_color(),
            pattern: "plain".to_string(),
            surface_id: "none".to_string(),
            border_style: None,
        },
        "neon-tech" | "ink-glass" | "ink" => ScratchAppearance {
            preset: "neon-tech".to_string(),
            background: "#1a2230".to_string(),
            opacity: 0.95,
            blur: 16.0,
            border_color: "#4a9cf0".to_string(),
            border_width: 0.0,
            radius: 8.0,
            pin_color: "#6eb8ff".to_string(),
            pattern: "graph".to_string(),
            surface_id: "neon-grid".to_string(),
            border_style: None,
        },
        "parchment" | "peach-grid" | "lemon" | "tape-kraft" | "mint-clean" | "mint" | "sage"
        | "bear-journal" => ScratchAppearance {
            preset: "parchment".to_string(),
            background: "#f6f0e6".to_string(),
            opacity: 0.95,
            blur: 0.0,
            border_color: "#c8b8a0".to_string(),
            border_width: 0.0,
            radius: 10.0,
            pin_color: "#a88860".to_string(),
            pattern: "lined".to_string(),
            surface_id: "parchment-fiber".to_string(),
            border_style: None,
        },
        "aurora" | "cream-gingham" | "dot-play" | "blush" => ScratchAppearance {
            preset: "aurora".to_string(),
            background: "#f5f8ff".to_string(),
            opacity: 0.95,
            blur: 6.0,
            border_color: "#b8c8e8".to_string(),
            border_width: 0.0,
            radius: 12.0,
            pin_color: "#7c8ce8".to_string(),
            pattern: "plain".to_string(),
            surface_id: "aurora-wash".to_string(),
            border_style: None,
        },
        _ => appearance_for_preset("caelum"),
    }
}

fn color_for_preset(preset: &str) -> String {
    match preset {
        "parchment" | "peach-grid" | "lemon" | "tape-kraft" | "mint-clean" | "mint" | "bear-journal" => {
            "lemon"
        }
        "neon-tech" | "ink-glass" | "ink" | "frost-glass" | "glass" | "caelum" | "fog-lined" | "fog"
        | "glass-cyan" => "fog",
        "aurora" | "dot-play" | "blush" | "cream-gingham" => "blush",
        _ => "ivory",
    }
    .to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ScratchStore {
    #[serde(default)]
    pub last_active_id: Option<String>,
    #[serde(default)]
    pub next_z: i64,
    #[serde(default)]
    pub notes: Vec<ScratchNote>,
}

pub struct ScratchManager {
    inner: Mutex<ScratchStore>,
}

impl ScratchManager {
    pub fn load() -> Self {
        Self {
            inner: Mutex::new(load_store_from_disk()),
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, ScratchStore> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn scratch_file_path() -> PathBuf {
    let config_dir = directories::BaseDirs::new()
        .map(|base_dirs| base_dirs.config_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from(".").join(".config"));
    config_dir.join("caelum").join("scratch.json")
}

fn load_store_from_disk() -> ScratchStore {
    let path = scratch_file_path();
    if !path.exists() {
        return ScratchStore::default();
    }
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => ScratchStore::default(),
    }
}

fn save_store_to_disk(store: &ScratchStore) -> Result<(), String> {
    let path = scratch_file_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let content = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn persist_and_emit(app: &AppHandle, store: &ScratchStore) -> Result<(), String> {
    save_store_to_disk(store)?;
    app.emit("scratch-changed", store)
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn window_label(id: &str) -> String {
    format!("scratch-{id}")
}

fn new_note_id() -> String {
    format!("s{:x}", now_ms())
}

fn preset_for_index(index: usize) -> &'static str {
    PRESETS[index % PRESETS.len()]
}

fn place_note(index: usize) -> (f64, f64, f64, f64) {
    let col = (index % 4) as f64;
    let row = (index / 4) as f64;
    let jitter_x = ((index * 17) % 37) as f64 - 8.0;
    let jitter_y = ((index * 13) % 33) as f64 - 6.0;
    let width = 228.0 + ((index * 11) % 52) as f64;
    let height = 236.0 + ((index * 19) % 68) as f64;
    (
        64.0 + col * 268.0 + jitter_x,
        56.0 + row * 268.0 + jitter_y,
        width,
        height,
    )
}

fn bump_z(store: &mut ScratchStore) -> i64 {
    store.next_z = store.next_z.max(
        store
            .notes
            .iter()
            .map(|note| note.z_index)
            .max()
            .unwrap_or(0),
    ) + 1;
    store.next_z
}

fn create_note_in_store(store: &mut ScratchStore, x: Option<f64>, y: Option<f64>) -> ScratchNote {
    let index = store.notes.len();
    let (placed_x, placed_y, width, height) = place_note(index);
    let now = now_ms();
    let preset = preset_for_index(index);
    let note = ScratchNote {
        id: new_note_id(),
        content: String::new(),
        status: default_status(),
        color: color_for_preset(preset),
        appearance: Some(appearance_for_preset(preset)),
        x: x.unwrap_or(placed_x),
        y: y.unwrap_or(placed_y),
        width,
        height,
        z_index: bump_z(store),
        always_on_top: false,
        created_at: now,
        updated_at: now,
        window_x: None,
        window_y: None,
        window_width: None,
        window_height: None,
        editor_mode: Some("todo".to_string()),
    };
    store.last_active_id = Some(note.id.clone());
    store.notes.push(note.clone());
    note
}

fn scratch_window_url(app: &AppHandle, id: &str) -> WebviewUrl {
    #[cfg(debug_assertions)]
    {
        if let Some(mut dev_url) = app.config().build.dev_url.clone() {
            let _ = dev_url.set_path("/scratch.html");
            dev_url.set_query(Some(&format!("id={id}")));
            return WebviewUrl::External(dev_url);
        }
    }
    let _ = app;
    WebviewUrl::App(format!("scratch.html?id={id}").into())
}

fn open_or_focus_window(app: &AppHandle, note: &ScratchNote) -> Result<(), String> {
    let label = window_label(&note.id);
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(note.always_on_top || note.status == "pinned");
        return Ok(());
    }

    // Never wait here. If this function is ever invoked on the UI thread,
    // blocking on WebView creation deadlocks the event loop (white HWND, frozen app).
    let app = app.clone();
    let note = note.clone();
    std::thread::Builder::new()
        .name("caelum-open-scratch".into())
        .spawn(move || {
            if let Err(error) = create_scratch_webview(&app, &note) {
                eprintln!("open scratch window: {error}");
            }
        })
        .map_err(|error| error.to_string())?;
    Ok(())
}

/// Must not run on the UI thread. wry `create_window` posts to the event loop and
/// waiting on that channel from the same thread deadlocks the app.
fn create_scratch_webview(app: &AppHandle, note: &ScratchNote) -> Result<(), String> {
    let label = window_label(&note.id);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let width = note.window_width.unwrap_or(DEFAULT_WINDOW_WIDTH).max(280.0);
    let height = note.window_height.unwrap_or(DEFAULT_WINDOW_HEIGHT).max(240.0);
    let always_on_top = note.always_on_top || note.status == "pinned";

    let mut builder = WebviewWindowBuilder::new(app, &label, scratch_window_url(app, &note.id))
        .title("快捷便签")
        .inner_size(width, height)
        .min_inner_size(320.0, 280.0)
        .decorations(false)
        .resizable(true)
        .always_on_top(always_on_top)
        .skip_taskbar(false)
        .visible(true)
        .focused(true)
        .shadow(true)
        .transparent(true)
        .accept_first_mouse(true)
        .initialization_script(format!(
            "window.__CAELUM_SCRATCH_ID__='{}';",
            note.id.replace('\'', "")
        ))
        .background_color(Color(0, 0, 0, 0));

    if let (Some(x), Some(y)) = (note.window_x, note.window_y) {
        builder = builder.position(x, y);
    } else {
        builder = builder.center();
    }

    builder.build().map(|_| ()).map_err(|error| error.to_string())
}

fn resolve_capture_note(store: &mut ScratchStore) -> ScratchNote {
    let now = now_ms();
    if let Some(id) = store.last_active_id.clone() {
        if let Some(index) = store.notes.iter().position(|note| note.id == id) {
            let reusable = {
                let note = &store.notes[index];
                note.status != "archived"
                    && (note.content.trim().is_empty() || now.saturating_sub(note.updated_at) < 90_000)
            };
            if reusable {
                store.notes[index].z_index = bump_z(store);
                store.notes[index].updated_at = now;
                return store.notes[index].clone();
            }
        }
    }

    store
        .notes
        .iter()
        .filter(|note| note.status == "inbox" && note.content.trim().is_empty())
        .max_by_key(|note| note.updated_at)
        .cloned()
        .unwrap_or_else(|| create_note_in_store(store, None, None))
}

pub fn toggle_scratch_capture(app: &AppHandle) -> Result<(), String> {
    let manager = app.state::<ScratchManager>();
    let last_active_id = {
        let store = manager.lock();
        store.last_active_id.clone()
    };

    if let Some(id) = last_active_id {
        let label = window_label(&id);
        if let Some(window) = app.get_webview_window(&label) {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
                return Ok(());
            }
        }
    }

    let note = {
        let mut store = manager.lock();
        let note = resolve_capture_note(&mut store);
        persist_and_emit(app, &store)?;
        note
    };
    open_or_focus_window(app, &note)
}

#[tauri::command]
pub fn load_scratch_store(manager: State<'_, ScratchManager>) -> ScratchStore {
    manager.lock().clone()
}

#[tauri::command]
pub fn upsert_scratch_note(
    app: AppHandle,
    manager: State<'_, ScratchManager>,
    note: ScratchNote,
) -> Result<ScratchStore, String> {
    let mut store = manager.lock();
    store.last_active_id = Some(note.id.clone());
    if let Some(existing) = store.notes.iter_mut().find(|item| item.id == note.id) {
        *existing = note;
    } else {
        store.notes.push(note);
    }
    persist_and_emit(&app, &store)?;
    Ok(store.clone())
}

#[tauri::command]
pub fn patch_scratch_note(
    app: AppHandle,
    manager: State<'_, ScratchManager>,
    patch: ScratchNotePatch,
) -> Result<ScratchStore, String> {
    let mut store = manager.lock();
    let Some(existing) = store.notes.iter_mut().find(|item| item.id == patch.id) else {
        return Err("便签不存在".to_string());
    };
    if let Some(content) = patch.content {
        existing.content = content;
    }
    if let Some(status) = patch.status {
        existing.status = status;
    }
    if let Some(color) = patch.color {
        existing.color = color;
    }
    if let Some(appearance) = patch.appearance {
        existing.appearance = Some(appearance);
    }
    if let Some(x) = patch.x {
        existing.x = x;
    }
    if let Some(y) = patch.y {
        existing.y = y;
    }
    if let Some(width) = patch.width {
        existing.width = width;
    }
    if let Some(height) = patch.height {
        existing.height = height;
    }
    if let Some(z_index) = patch.z_index {
        existing.z_index = z_index;
    }
    if let Some(always_on_top) = patch.always_on_top {
        existing.always_on_top = always_on_top;
    }
    if patch.window_x.is_some() {
        existing.window_x = patch.window_x;
    }
    if patch.window_y.is_some() {
        existing.window_y = patch.window_y;
    }
    if patch.window_width.is_some() {
        existing.window_width = patch.window_width;
    }
    if patch.window_height.is_some() {
        existing.window_height = patch.window_height;
    }
    if let Some(editor_mode) = patch.editor_mode {
        existing.editor_mode = Some(editor_mode);
    }
    existing.updated_at = now_ms();
    store.last_active_id = Some(patch.id);
    persist_and_emit(&app, &store)?;
    Ok(store.clone())
}

#[tauri::command]
pub fn create_scratch_note(
    app: AppHandle,
    manager: State<'_, ScratchManager>,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<ScratchNote, String> {
    let mut store = manager.lock();
    let note = create_note_in_store(&mut store, x, y);
    persist_and_emit(&app, &store)?;
    Ok(note)
}

#[tauri::command]
pub async fn delete_scratch_note(
    app: AppHandle,
    manager: State<'_, ScratchManager>,
    id: String,
) -> Result<ScratchStore, String> {
    if let Some(window) = app.get_webview_window(&window_label(&id)) {
        let _ = window.destroy();
    }
    let mut store = manager.lock();
    store.notes.retain(|note| note.id != id);
    if store.last_active_id.as_deref() == Some(id.as_str()) {
        store.last_active_id = store.notes.last().map(|note| note.id.clone());
    }
    persist_and_emit(&app, &store)?;
    Ok(store.clone())
}

#[tauri::command]
pub fn dismiss_scratch_window(window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn destroy_scratch_window(window: WebviewWindow) -> Result<(), String> {
    window
        .destroy()
        .or_else(|_| window.close())
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn close_scratch_window(app: AppHandle, id: String) -> Result<(), String> {
    let label = window_label(&id);
    if let Some(window) = app.get_webview_window(&label) {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_scratch_window(
    app: AppHandle,
    manager: State<'_, ScratchManager>,
    id: String,
) -> Result<(), String> {
    let note = {
        let mut store = manager.lock();
        let Some(index) = store.notes.iter().position(|note| note.id == id) else {
            return Err("便签不存在".to_string());
        };
        store.notes[index].z_index = bump_z(&mut store);
        store.last_active_id = Some(id.clone());
        let note = store.notes[index].clone();
        persist_and_emit(&app, &store)?;
        note
    };
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || open_or_focus_window(&app, &note))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn toggle_scratch_capture_cmd(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || toggle_scratch_capture(&app))
        .await
        .map_err(|error| error.to_string())?
}
