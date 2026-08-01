import { create } from "zustand"

import {
  combinePaths,
  createFileEntry,
  createFolderEntry,
  deleteEntry,
  ensureMarkdownExtension,
  getParentPath,
  initializeWorkspace,
  listNotesTree,
  moveEntry,
  readTextFile,
  renameEntry,
  saveWorkspaceConfig,
  writeTextFile,
  defaultSettings,
  defaultUiState,
} from "~/lib/workspace"

import type { AppSettings, ReadingPosition, WorkspaceConfig } from "~/lib/workspace"
import type { FileNode } from "~/components/App/FileTree/types"

export type ViewMode = "editor" | "preview" | "split"

let autosaveTimer: number | null = null

interface WorkspaceState {
  config: WorkspaceConfig | null
  tree: FileNode[]
  selectedFilePath: string | null
  currentContent: string
  dirty: boolean
  isLoading: boolean
  isSaving: boolean
  viewMode: ViewMode
  sidebarWidth: number
  searchQuery: string
  openFiles: string[]
  initialized: boolean
  initialize: () => Promise<void>
  setSearchQuery: (value: string) => void
  setViewMode: (mode: ViewMode) => void
  setSidebarWidth: (width: number) => void
  setTree: (tree: FileNode[]) => void
  selectFile: (path: string) => Promise<void>
  updateContent: (content: string) => void
  saveActiveFile: () => Promise<void>
  createFile: (name: string, parentPath?: string) => Promise<string | null>
  createFolder: (name: string, parentPath?: string) => Promise<void>
  renameNode: (oldPath: string, newName: string) => Promise<void>
  deleteNode: (path: string) => Promise<void>
  moveNode: (oldPath: string, newPath: string) => Promise<void>
  refreshTree: () => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  updateWorkspaceConfig: (config: Partial<Pick<WorkspaceConfig, "notesPath" | "assetsPath" | "workspaceName">>) => Promise<void>
  updateUiState: (patch: Partial<WorkspaceConfig["uiState"]>) => Promise<void>
  recordReadingPosition: (path: string, position: Partial<ReadingPosition>) => Promise<void>
  closeFileTab: (path: string) => Promise<void>
}

const defaultState = {
  config: null,
  tree: [],
  selectedFilePath: null,
  currentContent: "",
  dirty: false,
  isLoading: false,
  isSaving: false,
  viewMode: "split" as ViewMode,
  sidebarWidth: 280,
  searchQuery: "",
  openFiles: [],
  initialized: false,
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...defaultState,

  initialize: async () => {
    set({ isLoading: true })
    const config = await initializeWorkspace()
    const tree = await listNotesTree(config.notesPath)
    const normalizedConfig = {
      ...config,
      settings: {
        ...defaultSettings,
        ...config.settings,
      },
      uiState: {
        ...defaultUiState,
        ...config.uiState,
      },
    }
    const initialViewMode = normalizedConfig.uiState.lastViewMode || (
      normalizedConfig.uiState.defaultOpenMode === "preview" ? "preview" : "editor"
    )

    set({
      config: normalizedConfig,
      tree,
      initialized: true,
      isLoading: false,
      searchQuery: "",
      viewMode: initialViewMode as ViewMode,
      openFiles: normalizedConfig.uiState.openFiles,
      selectedFilePath: normalizedConfig.uiState.activeFilePath,
    })

    if (normalizedConfig.uiState.activeFilePath) {
      await get().selectFile(normalizedConfig.uiState.activeFilePath)
      return
    }

    if (normalizedConfig.uiState.openFiles.length > 0) {
      const [firstOpenFile] = normalizedConfig.uiState.openFiles
      if (firstOpenFile) {
        await get().selectFile(firstOpenFile)
        return
      }
    }

    if (normalizedConfig.recentFiles.length > 0 && normalizedConfig.settings.startWithLastFile) {
      const [latestFile] = normalizedConfig.recentFiles
      if (latestFile) {
        await get().selectFile(latestFile)
      }
    }
  },

  setSearchQuery: (value) => set({ searchQuery: value }),
  setViewMode: (mode) => {
    const config = get().config
    set({ viewMode: mode })

    if (config) {
      const nextConfig = {
        ...config,
        uiState: {
          ...config.uiState,
          lastViewMode: mode,
        },
      }

      void saveWorkspaceConfig(nextConfig)
      set({ config: nextConfig })
    }
  },
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setTree: (tree) => set({ tree }),

  selectFile: async (path) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const content = await readTextFile(normalizedPath)
    const recentFiles = [normalizedPath, ...(config.recentFiles ?? []).filter((item) => item !== normalizedPath)].slice(0, 10)
    const openFiles = [normalizedPath, ...(get().openFiles ?? []).filter((item) => item !== normalizedPath)].slice(0, 8)
    const nextConfig = {
      ...config,
      recentFiles,
      settings: config.settings,
      uiState: {
        ...config.uiState,
        activeFilePath: normalizedPath,
        openFiles,
      },
    }

    await saveWorkspaceConfig(nextConfig)

    set({
      selectedFilePath: normalizedPath,
      currentContent: content,
      dirty: false,
      config: nextConfig,
      openFiles,
    })
  },

  updateContent: (content) => {
    set({ currentContent: content, dirty: true })
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
    }

    const autoSaveEnabled = get().config?.settings.autoSave ?? true
    const interval = get().config?.settings.autoSaveInterval ?? 600

    if (get().selectedFilePath && autoSaveEnabled) {
      autosaveTimer = window.setTimeout(() => {
        void get().saveActiveFile()
      }, interval)
    }
  },

  saveActiveFile: async () => {
    const { selectedFilePath, currentContent } = get()
    if (!selectedFilePath) {
      return
    }

    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }

    set({ isSaving: true })
    await writeTextFile(selectedFilePath, currentContent)
    set({ dirty: false, isSaving: false })
  },

  createFile: async (name, parentPath) => {
    const config = get().config
    if (!config) {
      return null
    }

    const basePath = parentPath ?? config.notesPath
    const fileName = ensureMarkdownExtension(name)
    const nextPath = combinePaths(basePath, fileName)

    await createFileEntry(nextPath)
    await get().refreshTree()
    await get().selectFile(nextPath)
    return nextPath
  },

  createFolder: async (name, parentPath) => {
    const config = get().config
    if (!config) {
      return
    }

    const basePath = parentPath ?? config.notesPath
    const nextPath = combinePaths(basePath, name)

    await createFolderEntry(nextPath)
    await get().refreshTree()
  },

  renameNode: async (oldPath, newName) => {
    const parentPath = getParentPath(oldPath)
    const nextPath = parentPath ? combinePaths(parentPath, newName) : newName

    await renameEntry(oldPath, nextPath)
    if (get().selectedFilePath === oldPath) {
      await get().selectFile(nextPath)
    }
    await get().refreshTree()
  },

  deleteNode: async (path) => {
    await deleteEntry(path)
    if (get().selectedFilePath === path) {
      set({ selectedFilePath: null, currentContent: "", dirty: false })
    }
    await get().refreshTree()
  },

  moveNode: async (oldPath, newPath) => {
    await moveEntry(oldPath, newPath)
    if (get().selectedFilePath === oldPath) {
      await get().selectFile(newPath)
    }
    await get().refreshTree()
  },

  refreshTree: async () => {
    const config = get().config
    if (!config) {
      return
    }

    const tree = await listNotesTree(config.notesPath)
    set({ tree })
  },

  updateSettings: async (settings) => {
    const config = get().config
    if (!config) {
      return
    }

    const nextConfig = {
      ...config,
      settings: {
        ...config.settings,
        ...settings,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig })
  },

  updateWorkspaceConfig: async (configPatch) => {
    const config = get().config
    if (!config) {
      return
    }

    const nextConfig = {
      ...config,
      ...configPatch,
      settings: config.settings,
      uiState: config.uiState,
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig })
  },

  updateUiState: async (patch) => {
    const config = get().config
    if (!config) {
      return
    }

    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        ...patch,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig, openFiles: nextConfig.uiState.openFiles })
  },

  recordReadingPosition: async (path, position) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const existing = config.uiState.readingPositions[normalizedPath] ?? {
      editorScrollTop: 0,
      previewScrollTop: 0,
    }

    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        readingPositions: {
          ...config.uiState.readingPositions,
          [normalizedPath]: {
            ...existing,
            ...position,
          },
        },
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig })
  },

  closeFileTab: async (path) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const openFiles = config.uiState.openFiles.filter((item) => item !== normalizedPath)
    const nextActive = get().selectedFilePath === normalizedPath
      ? openFiles[openFiles.length - 1] ?? null
      : get().selectedFilePath

    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        activeFilePath: nextActive,
        openFiles,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({
      config: nextConfig,
      openFiles,
      selectedFilePath: nextActive,
    })

    if (nextActive) {
      await get().selectFile(nextActive)
    } else {
      set({ currentContent: "", dirty: false })
    }
  },
}))
