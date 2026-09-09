import type { AppSettings, WorkspaceUiState } from "~/lib/workspace-types"

export const DEFAULT_WINDOW_WIDTH = 1200
export const DEFAULT_WINDOW_HEIGHT = 760
export const MIN_WINDOW_WIDTH = 900
export const MIN_WINDOW_HEIGHT = 560
export const DEFAULT_OUTLINE_WIDTH = 250

export const defaultSettings: AppSettings = {
  themeMode: "system",
  themeColor: "blue",
  editorFontSize: 14,
  editorFontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  showLineNumbers: true,
  wordWrap: true,
  tabSize: 2,
  codeHighlight: true,
  codeHighlightTheme: "auto",
  codeBlockLineNumbers: true,
  mermaidTheme: "auto",
  autoSave: true,
  autoSaveInterval: 600,
  startWithLastFile: true,
  scrollSync: true,
  confirmInvalidExtension: true,
  language: "zh-CN",
  scratchHotkey: "Ctrl+Alt+N",
}

export const defaultUiState: WorkspaceUiState = {
  defaultOpenMode: "editor",
  lastViewMode: "editor",
  activeFilePath: null,
  openFiles: [],
  splitRatio: 50,
  splitOrientation: "horizontal",
  readingPositions: {},
  sidebarCollapsed: false,
  outlineVisible: false,
  outlineWidth: DEFAULT_OUTLINE_WIDTH,
  windowWidth: DEFAULT_WINDOW_WIDTH,
  windowHeight: DEFAULT_WINDOW_HEIGHT,
  gotoPanelPosition: null,
  quickOpenPosition: null,
}
