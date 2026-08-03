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

export const ensureMarkdownExtension = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) {
    return "untitled.md"
  }

  return trimmed.includes(".") ? trimmed : `${trimmed}.md`
}

export const isMarkdownFile = (value: string) => value.toLowerCase().endsWith(".md")

export const isTextFile = (value: string) => value.toLowerCase().endsWith(".txt")

export const initializeWorkspace = async (): Promise<WorkspaceConfig> =>
  invoke<WorkspaceConfig>("load_workspace_config")

export const getDefaultWorkspacePaths = async (): Promise<WorkspacePaths> =>
  invoke<WorkspacePaths>("get_default_workspace_paths")

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
