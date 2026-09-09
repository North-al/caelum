use std::fs;
use std::path::{Path, PathBuf};

use crate::config::FileEntry;

pub(crate) fn allocate_unique_path(dir: &Path, file_name: &str) -> PathBuf {
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

pub(crate) fn ensure_parent_directory(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
    }
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
            if !is_visible_dotfile(&name) {
                continue;
            }
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

            if is_tree_visible_entry(&name, &extension) {
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

pub(crate) fn is_special_text_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "dockerfile"
            | "makefile"
            | "gemfile"
            | "procfile"
            | ".env"
            | ".gitignore"
            | ".dockerignore"
            | ".npmrc"
            | ".nvmrc"
            | ".editorconfig"
            | ".eslintrc"
            | ".prettierrc"
            | ".babelrc"
    ) || lower.starts_with(".env.")
}

pub(crate) fn is_editable_text_extension(extension: &str) -> bool {
    matches!(
        extension,
        "md" | "markdown"
            | "mdx"
            | "txt"
            | "log"
            | "csv"
            | "ini"
            | "json"
            | "jsonc"
            | "json5"
            | "xml"
            | "yaml"
            | "yml"
            | "toml"
            | "env"
            | "properties"
            | "conf"
            | "cfg"
            | "config"
            | "html"
            | "htm"
            | "css"
            | "scss"
            | "less"
            | "svg"
            | "js"
            | "mjs"
            | "cjs"
            | "ts"
            | "jsx"
            | "tsx"
            | "vue"
            | "svelte"
            | "sh"
            | "bash"
            | "zsh"
            | "ps1"
            | "bat"
            | "cmd"
            | "py"
            | "go"
            | "rs"
            | "java"
            | "kt"
            | "kts"
            | "c"
            | "h"
            | "cpp"
            | "cc"
            | "cxx"
            | "hpp"
            | "cs"
            | "sql"
            | "graphql"
            | "gql"
            | "proto"
    )
}

pub(crate) fn is_image_extension(extension: &str) -> bool {
    matches!(
        extension,
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "avif" | "svg"
    )
}

pub(crate) fn is_visible_dotfile(name: &str) -> bool {
    if is_special_text_name(name) {
        return true;
    }
    let lower = name.to_ascii_lowercase();
    let extension = Path::new(&lower)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    is_editable_text_extension(extension)
}

pub(crate) fn is_tree_visible_entry(name: &str, extension: &str) -> bool {
    if is_special_text_name(name) {
        return true;
    }
    is_editable_text_extension(extension) || is_image_extension(extension)
}

pub(crate) fn is_openable_note_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    let path_obj = Path::new(&lower);
    let name = path_obj
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let extension = path_obj
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    is_tree_visible_entry(name, extension)
}

#[tauri::command]
pub fn list_notes_tree(path: String) -> Result<Vec<FileEntry>, String> {
    let root_path = PathBuf::from(path);
    if !root_path.exists() {
        return Ok(Vec::new());
    }

    build_tree(&root_path)
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(path);
    ensure_parent_directory(&file_path)?;
    fs::write(file_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[tauri::command]
pub fn create_file_entry(path: String) -> Result<(), String> {
    let file_path = PathBuf::from(path);
    if file_path.exists() {
        return Err("File already exists".to_string());
    }
    ensure_parent_directory(&file_path)?;
    fs::write(file_path, "").map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_folder_entry(path: String) -> Result<(), String> {
    let folder_path = PathBuf::from(path);
    if folder_path.exists() {
        return Err("Folder already exists".to_string());
    }
    fs::create_dir_all(folder_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let entry_path = PathBuf::from(path);
    if entry_path.is_dir() {
        fs::remove_dir_all(entry_path).map_err(|error| error.to_string())
    } else {
        fs::remove_file(entry_path).map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub fn move_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn copy_file_entry(source: String, destination_dir: String) -> Result<String, String> {
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
pub fn copy_file_to_path(source: String, destination: String) -> Result<(), String> {
    let destination_path = PathBuf::from(&destination);
    ensure_parent_directory(&destination_path)?;
    fs::copy(source, destination_path).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn write_binary_file(path: String, contents_base64: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let bytes = STANDARD
        .decode(contents_base64.trim())
        .map_err(|error| format!("二进制内容解码失败: {error}"))?;
    let file_path = PathBuf::from(path);
    ensure_parent_directory(&file_path)?;
    fs::write(file_path, bytes).map_err(|error| error.to_string())
}
