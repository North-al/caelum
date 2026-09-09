export type ThemeMode = "system" | "light" | "dark"
export type ThemeColor = "blue" | "purple" | "cyan"
export type DefaultOpenMode = "editor" | "preview"

export interface ReadingPosition {
  editorScrollTop: number
  previewScrollTop: number
}

export type SplitOrientation = "horizontal" | "vertical"

export interface WorkspaceUiState {
  defaultOpenMode: DefaultOpenMode
  lastViewMode: "editor" | "preview" | "split"
  activeFilePath: string | null
  openFiles: string[]
  splitRatio: number
  /** Editor/preview split direction when viewMode is split */
  splitOrientation: SplitOrientation
  readingPositions: Record<string, ReadingPosition>
  sidebarCollapsed: boolean
  outlineVisible: boolean
  /** Outline panel width in pixels */
  outlineWidth: number
  windowWidth: number
  windowHeight: number
  /** Remembered position for Ctrl+G go-to-line panel */
  gotoPanelPosition: { left: number; top: number } | null
  /** Remembered position for double-Shift quick open */
  quickOpenPosition: { left: number; top: number } | null
}

export type MermaidThemeSetting =
  | "auto"
  | "default"
  | "dark"
  | "forest"
  | "neutral"
  | "base"

export interface AppSettings {
  themeMode: ThemeMode
  themeColor: ThemeColor
  editorFontSize: number
  editorFontFamily: string
  showLineNumbers: boolean
  wordWrap: boolean
  tabSize: number
  codeHighlight: boolean
  /** highlight.js theme id; `auto` follows light/dark appearance */
  codeHighlightTheme: string
  /** Show line numbers in markdown preview code blocks */
  codeBlockLineNumbers: boolean
  /**
   * Mermaid diagram theme.
   * `auto` follows app light/dark; otherwise a fixed Mermaid theme id.
   */
  mermaidTheme: MermaidThemeSetting
  autoSave: boolean
  autoSaveInterval: number
  startWithLastFile: boolean
  scrollSync: boolean
  /** Confirm before saving a rename with an unsupported extension */
  confirmInvalidExtension: boolean
  language: string
  /** Global accelerator for scratch capture, e.g. Ctrl+Alt+N */
  scratchHotkey: string
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

export interface AppPaths {
  configPath: string
  defaultNotesPath: string
  defaultAssetsPath: string
}

export interface ClipboardImagePayload {
  width: number
  height: number
  bytes: number[]
}
