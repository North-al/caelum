//! Cross-platform clipboard helpers built on `arboard`.
//! Windows / macOS / Linux share the same command surface for text, images, and file lists.

use std::path::PathBuf;

use arboard::{Clipboard, ImageData};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardImage {
    pub width: u32,
    pub height: u32,
    /// RGBA bytes, length = width * height * 4.
    pub bytes: Vec<u8>,
}

fn map_clipboard_error(error: arboard::Error) -> String {
    match error {
        arboard::Error::ClipboardOccupied => {
            "剪贴板正被其他程序占用，请稍后重试".to_string()
        }
        arboard::Error::ContentNotAvailable => "剪贴板中没有可用的该类型内容".to_string(),
        arboard::Error::ClipboardNotSupported => "当前环境不支持系统剪贴板".to_string(),
        arboard::Error::ConversionFailure => "剪贴板数据格式转换失败".to_string(),
        other => {
            let message = other.to_string();
            if message.to_ascii_lowercase().contains("denied")
                || message.to_ascii_lowercase().contains("permission")
                || message.to_ascii_lowercase().contains("not authorized")
            {
                "没有剪贴板访问权限，请在系统设置中允许后重试".to_string()
            } else {
                format!("剪贴板操作失败：{message}")
            }
        }
    }
}

fn open_clipboard() -> Result<Clipboard, String> {
    Clipboard::new().map_err(map_clipboard_error)
}

fn normalize_path(path: PathBuf) -> String {
    let mut normalized = path.to_string_lossy().replace('\\', "/");
    if let Some(stripped) = normalized.strip_prefix("//?/") {
        normalized = stripped.to_string();
    }
    if let Some(stripped) = normalized.strip_prefix(r"\\?\") {
        normalized = stripped.to_string();
    }
    normalized
}

pub fn read_text() -> Result<String, String> {
    let mut clipboard = open_clipboard()?;
    clipboard.get().text().map_err(map_clipboard_error)
}

pub fn write_text(text: String) -> Result<(), String> {
    let mut clipboard = open_clipboard()?;
    clipboard.set().text(text).map_err(map_clipboard_error)
}

pub fn read_image() -> Result<ClipboardImage, String> {
    let mut clipboard = open_clipboard()?;
    let image = clipboard.get().image().map_err(map_clipboard_error)?;
    Ok(ClipboardImage {
        width: image.width as u32,
        height: image.height as u32,
        bytes: image.bytes.into_owned(),
    })
}

pub fn write_image(image: ClipboardImage) -> Result<(), String> {
    if image.width == 0 || image.height == 0 {
        return Err("图片尺寸无效".to_string());
    }
    let expected = (image.width as usize)
        .checked_mul(image.height as usize)
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or_else(|| "图片尺寸过大".to_string())?;
    if image.bytes.len() != expected {
        return Err(format!(
            "图片数据长度不匹配（期望 {expected} 字节，实际 {}）",
            image.bytes.len()
        ));
    }

    let mut clipboard = open_clipboard()?;
    let data = ImageData {
        width: image.width as usize,
        height: image.height as usize,
        bytes: std::borrow::Cow::Owned(image.bytes),
    };
    clipboard.set().image(data).map_err(map_clipboard_error)
}

pub fn read_file_paths() -> Result<Vec<String>, String> {
    let mut clipboard = open_clipboard()?;
    match clipboard.get().file_list() {
        Ok(list) => Ok(list.into_iter().map(normalize_path).collect()),
        Err(arboard::Error::ContentNotAvailable) => Ok(Vec::new()),
        Err(error) => Err(map_clipboard_error(error)),
    }
}

pub fn write_file_paths(paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Err("没有可复制的路径".to_string());
    }
    let path_bufs: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    let mut clipboard = open_clipboard()?;
    clipboard
        .set()
        .file_list(&path_bufs)
        .map_err(map_clipboard_error)
}
