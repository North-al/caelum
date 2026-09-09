/** Workspace facade — keep `~/lib/workspace` imports stable. */

export type {
  AppPaths,
  AppSettings,
  ClipboardImagePayload,
  DefaultOpenMode,
  MermaidThemeSetting,
  ReadingPosition,
  SplitOrientation,
  ThemeColor,
  ThemeMode,
  WorkspaceConfig,
  WorkspacePaths,
  WorkspaceUiState,
} from "~/lib/workspace-types"

export {
  DEFAULT_OUTLINE_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  defaultSettings,
  defaultUiState,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "~/lib/workspace-defaults"

export {
  allocateUniqueFileName,
  combinePaths,
  ensureFileExtension,
  ensureMarkdownExtension,
  getParentPath,
  isMarkdownFile,
  isTextFile,
  normalizePath,
  pathExists,
  resolveJoinedPath,
} from "~/lib/workspace-paths"

export {
  clipboardReadImage,
  clipboardReadText,
  clipboardWriteImage,
  clipboardWriteText,
  copyFileEntry,
  copyFileToPath,
  createFileEntry,
  createFolderEntry,
  deleteEntry,
  getAppPaths,
  getClipboardFilePaths,
  getDefaultWorkspacePaths,
  getLaunchFilePaths,
  initializeWorkspace,
  listNotesTree,
  moveEntry,
  readTextFile,
  renameEntry,
  saveWorkspaceConfig,
  setClipboardFilePaths,
  writeBinaryFile,
  writeTextFile,
  writeTextToClipboard,
} from "~/lib/workspace-api"
