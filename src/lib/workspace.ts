import { invoke } from "@tauri-apps/api/core"

import type { FileNode } from "~/components/App/FileTree/types"

export type ThemeMode = "system" | "light" | "dark"
export type ThemeColor = "blue" | "purple" | "cyan"
export type DefaultOpenMode = "editor" | "preview"

export interface ReadingPosition {
  editorScrollTop: number
  previewScrollTop: number
}

export interface WorkspaceUiState {
  defaultOpenMode: DefaultOpenMode
  lastViewMode: "editor" | "preview" | "split"
  activeFilePath: string | null
  openFiles: string[]
  splitRatio: number
  readingPositions: Record<string, ReadingPosition>
  sidebarCollapsed: boolean
  outlineVisible: boolean
  /** Outline panel width in pixels */
  outlineWidth: number
  windowWidth: number
  windowHeight: number
}

export interface AppSettings {
  themeMode: ThemeMode
  themeColor: ThemeColor
  editorFontSize: number
  editorFontFamily: string
  showLineNumbers: boolean
  wordWrap: boolean
  tabSize: number
  livePreview: boolean
  codeHighlight: boolean
  /** highlight.js theme id; `auto` follows light/dark appearance */
  codeHighlightTheme: string
  /** Show line numbers in markdown preview code blocks */
  codeBlockLineNumbers: boolean
  autoSave: boolean
  autoSaveInterval: number
  startWithLastFile: boolean
  scrollSync: boolean
  language: string
}

export interface WorkspaceConfig {
  notesPath: string
  assetsPath: string
  workspaceName: string
  recentFiles: string[]
  settings: AppSettings
  uiState: WorkspaceUiState
}

export interface WorkspacePaths {
  notesPath: string
  assetsPath: string
}

export const DEFAULT_WINDOW_WIDTH = 1200
export const DEFAULT_WINDOW_HEIGHT = 760
export const DEFAULT_OUTLINE_WIDTH = 250

export const defaultSettings: AppSettings = {
  themeMode: "system",
  themeColor: "blue",
  editorFontSize: 14,
  editorFontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  showLineNumbers: true,
  wordWrap: true,
  tabSize: 2,
  livePreview: true,
  codeHighlight: true,
  codeHighlightTheme: "auto",
  codeBlockLineNumbers: true,
  autoSave: true,
  autoSaveInterval: 600,
  startWithLastFile: true,
  scrollSync: false,
  language: "zh-CN",
}

export const defaultUiState: WorkspaceUiState = {
  defaultOpenMode: "preview",
  lastViewMode: "preview",
  activeFilePath: null,
  openFiles: [],
  splitRatio: 50,
  readingPositions: {},
  sidebarCollapsed: false,
  outlineVisible: false,
  outlineWidth: DEFAULT_OUTLINE_WIDTH,
  windowWidth: DEFAULT_WINDOW_WIDTH,
  windowHeight: DEFAULT_WINDOW_HEIGHT,
}

export const normalizePath = (value: string) => value.replace(/\\/g, "/")

export const combinePaths = (base: string, child: string) => {
  const cleanedBase = normalizePath(base).replace(/\/+$/, "")
  const cleanedChild = normalizePath(child).replace(/^\/+/, "")

  if (!cleanedBase) {
    return cleanedChild
  }

  return `${cleanedBase}/${cleanedChild}`
}

/** Join base + relative and resolve `.` / `..` segments. */
export const resolveJoinedPath = (base: string, relative: string) => {
  const normalizedRelative = normalizePath(relative)

  if (/^[A-Za-z]:[\\/]/.test(normalizedRelative)) {
    return normalizePath(normalizedRelative)
  }

  const baseNormalized = normalizePath(base).replace(/\/+$/, "")
  if (normalizedRelative.startsWith("/") && !/^[A-Za-z]:/.test(baseNormalized)) {
    return normalizePath(normalizedRelative)
  }

  const baseHref = `file:///${baseNormalized}/`
  const resolved = new URL(normalizedRelative, baseHref)
  let path = decodeURIComponent(resolved.pathname)
  if (/^\/[A-Za-z]:\//.test(path)) {
    path = path.slice(1)
  }
  return normalizePath(path)
}

export const getParentPath = (value: string) => {
  const normalized = normalizePath(value)
  const separatorIndex = normalized.lastIndexOf("/")

  if (separatorIndex <= 0) {
    return ""
  }

  return normalized.slice(0, separatorIndex)
}

export const ensureMarkdownExtension = (name: string) => ensureFileExtension(name, "md")

export const ensureFileExtension = (name: string, extension: string) => {
  const trimmed = name.trim()
  const normalizedExt = extension.replace(/^\./, "").toLowerCase() || "md"
  if (!trimmed) {
    return `untitled.${normalizedExt}`
  }

  if (trimmed.includes(".")) {
    return trimmed
  }

  return `${trimmed}.${normalizedExt}`
}

/** Allocate note.md / note-1.md / note-2.md style unique names. */
export const allocateUniqueFileName = async (directory: string, desiredName: string) => {
  const fileName = desiredName.includes(".") ? desiredName : ensureFileExtension(desiredName, "md")
  const stem = fileName.replace(/\.[^.]+$/, "") || "untitled"
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1) : "md"

  let candidate = `${stem}.${extension}`
  let index = 1
  while (await pathExists(combinePaths(directory, candidate))) {
    candidate = `${stem}-${index}.${extension}`
    index += 1
    if (index > 999) {
      candidate = `${stem}-${Date.now()}.${extension}`
      break
    }
  }
  return candidate
}

export const isMarkdownFile = (value: string) => {
  const lower = value.toLowerCase()
  return lower.endsWith(".md") || lower.endsWith(".markdown")
}

export const isTextFile = (value: string) => {
  const lower = value.toLowerCase()
  return lower.endsWith(".txt") || lower.endsWith(".ini")
}

export const initializeWorkspace = async (): Promise<WorkspaceConfig> =>
  invoke<WorkspaceConfig>("load_workspace_config")

export const getDefaultWorkspacePaths = async (): Promise<WorkspacePaths> =>
  invoke<WorkspacePaths>("get_default_workspace_paths")

export interface AppPaths {
  configPath: string
  defaultNotesPath: string
  defaultAssetsPath: string
}

export const getAppPaths = async (): Promise<AppPaths> => invoke<AppPaths>("get_app_paths")

export const saveWorkspaceConfig = async (config: WorkspaceConfig): Promise<WorkspaceConfig> =>
  invoke<WorkspaceConfig>("save_workspace_config", { config })

export const listNotesTree = async (notesPath: string): Promise<FileNode[]> =>
  invoke<FileNode[]>("list_notes_tree", { path: notesPath })

export const readTextFile = async (path: string): Promise<string> =>
  invoke<string>("read_text_file", { path })

export const writeTextFile = async (path: string, content: string): Promise<void> =>
  invoke<void>("write_text_file", { path, content })

export const createFileEntry = async (path: string): Promise<void> =>
  invoke<void>("create_file_entry", { path })

export const createFolderEntry = async (path: string): Promise<void> =>
  invoke<void>("create_folder_entry", { path })

export const renameEntry = async (oldPath: string, newPath: string): Promise<void> =>
  invoke<void>("rename_entry", { oldPath, newPath })

export const deleteEntry = async (path: string): Promise<void> =>
  invoke<void>("delete_entry", { path })

export const moveEntry = async (oldPath: string, newPath: string): Promise<void> =>
  invoke<void>("move_entry", { oldPath, newPath })

export const copyFileEntry = async (source: string, destinationDir: string): Promise<string> =>
  invoke<string>("copy_file_entry", { source, destinationDir })

export const copyFileToPath = async (source: string, destination: string): Promise<void> =>
  invoke<void>("copy_file_to_path", { source, destination })

export const writeBinaryFile = async (path: string, contents: number[]): Promise<void> =>
  invoke<void>("write_binary_file", { path, contents })

export const pathExists = async (path: string): Promise<boolean> => invoke<boolean>("path_exists", { path })

export const getClipboardFilePaths = async (): Promise<string[]> =>
  invoke<string[]>("get_clipboard_file_paths")

export const setClipboardFilePaths = async (paths: string[]): Promise<void> =>
  invoke<void>("set_clipboard_file_paths", { paths })

export const getLaunchFilePaths = async (): Promise<string[]> =>
  invoke<string[]>("get_launch_file_paths")
