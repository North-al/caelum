import { create } from "zustand"

import {
  combinePaths,
  createFileEntry,
  createFolderEntry,
  copyFileEntry,
  deleteEntry,
  ensureFileExtension,
  allocateUniqueFileName,
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
import { isBinaryImagePath } from "~/lib/file-types"

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
  sidebarCollapsed: boolean
  outlineVisible: boolean
  searchQuery: string
  openFiles: string[]
  initialized: boolean
  initialize: () => Promise<void>
  setSearchQuery: (value: string) => void
  setViewMode: (mode: ViewMode) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setOutlineVisible: (visible: boolean) => void
  setTree: (tree: FileNode[]) => void
  selectFile: (path: string) => Promise<void>
  updateContent: (content: string) => void
  saveActiveFile: () => Promise<void>
  createFile: (name: string, parentPath?: string) => Promise<string | null>
  createFolder: (name: string, parentPath?: string) => Promise<void>
  renameNode: (oldPath: string, newName: string) => Promise<void>
  deleteNode: (path: string) => Promise<void>
  moveNode: (oldPath: string, newPath: string) => Promise<void>
  copyFileToDirectory: (sourcePath: string, destinationDir: string) => Promise<string | null>
  refreshTree: () => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  updateWorkspaceConfig: (config: Partial<Pick<WorkspaceConfig, "notesPath" | "assetsPath" | "workspaceName">>) => Promise<void>
  updateUiState: (patch: Partial<WorkspaceConfig["uiState"]>) => Promise<void>
  recordReadingPosition: (path: string, position: Partial<ReadingPosition>) => Promise<void>
  closeFileTab: (path: string) => Promise<void>
  reorderTabs: (fromIndex: number, toIndex: number) => Promise<void>
  closeOtherTabs: (path: string) => Promise<void>
  closeTabsToTheRight: (path: string) => Promise<void>
  closeAllTabs: () => Promise<void>
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
  sidebarCollapsed: false,
  outlineVisible: false,
  searchQuery: "",
  openFiles: [],
  initialized: false,
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...defaultState,

  initialize: async () => {
    // Settings ↔ Home remounts should not reload session or reopen closed tabs.
    if (get().initialized) {
      return
    }

    set({ isLoading: true })
    const config = await initializeWorkspace()
    const tree = await listNotesTree(config.notesPath)
    const normalizedConfig = {
      ...config,
      settings: {
        ...defaultSettings,
        ...config.settings,
        editorFontSize:
          config.settings?.editorFontSize && config.settings.editorFontSize > 0
            ? config.settings.editorFontSize
            : defaultSettings.editorFontSize,
      },
      uiState: {
        ...defaultUiState,
        ...config.uiState,
        outlineWidth:
          config.uiState?.outlineWidth && config.uiState.outlineWidth > 0
            ? config.uiState.outlineWidth
            : defaultUiState.outlineWidth,
        windowWidth:
          config.uiState?.windowWidth && config.uiState.windowWidth > 0
            ? config.uiState.windowWidth
            : defaultUiState.windowWidth,
        windowHeight:
          config.uiState?.windowHeight && config.uiState.windowHeight > 0
            ? config.uiState.windowHeight
            : defaultUiState.windowHeight,
      },
    }
    const initialViewMode = normalizedConfig.uiState.lastViewMode || (
      normalizedConfig.uiState.defaultOpenMode === "preview" ? "preview" : "editor"
    )

    const persistedOpenFiles = (normalizedConfig.uiState.openFiles ?? []).filter(Boolean)
    const persistedActive =
      normalizedConfig.uiState.activeFilePath &&
      persistedOpenFiles.includes(normalizedConfig.uiState.activeFilePath)
        ? normalizedConfig.uiState.activeFilePath
        : persistedOpenFiles[0] ?? null

    // startWithLastFile only restores when there is a persisted tab session —
    // never reopen files the user already closed (do not fall back to recentFiles alone).
    const shouldRestoreSession = persistedOpenFiles.length > 0

    set({
      config: {
        ...normalizedConfig,
        uiState: {
          ...normalizedConfig.uiState,
          openFiles: shouldRestoreSession ? persistedOpenFiles : [],
          activeFilePath: shouldRestoreSession ? persistedActive : null,
        },
      },
      tree,
      initialized: true,
      isLoading: false,
      searchQuery: "",
      viewMode: initialViewMode as ViewMode,
      openFiles: shouldRestoreSession ? persistedOpenFiles : [],
      selectedFilePath: shouldRestoreSession ? persistedActive : null,
      sidebarCollapsed: normalizedConfig.uiState.sidebarCollapsed,
      outlineVisible: normalizedConfig.uiState.outlineVisible,
    })

    if (shouldRestoreSession && persistedActive) {
      await get().selectFile(persistedActive)
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
  setSidebarCollapsed: (collapsed) => {
    const config = get().config
    set({ sidebarCollapsed: collapsed })

    if (config) {
      const nextConfig = {
        ...config,
        uiState: {
          ...config.uiState,
          sidebarCollapsed: collapsed,
        },
      }

      void saveWorkspaceConfig(nextConfig)
      set({ config: nextConfig })
    }
  },
  setOutlineVisible: (visible) => {
    const config = get().config
    set({ outlineVisible: visible })

    if (config) {
      const nextConfig = {
        ...config,
        uiState: {
          ...config.uiState,
          outlineVisible: visible,
        },
      }

      void saveWorkspaceConfig(nextConfig)
      set({ config: nextConfig })
    }
  },
  setTree: (tree) => set({ tree }),

  selectFile: async (path) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const tree = get().tree

    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path.replace(/\\/g, "/") === normalizedPath) {
          return node
        }
        if (node.children) {
          const found = findNode(node.children)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    const node = findNode(tree)
    if (node?.type === "folder") {
      return
    }

    // Binary images are opened as preview tabs without reading as text.
    let content = ""
    if (!isBinaryImagePath(normalizedPath)) {
      content = await readTextFile(normalizedPath)
    }

    const recentFiles = [normalizedPath, ...(config.recentFiles ?? []).filter((item) => item !== normalizedPath)].slice(0, 10)
    const currentOpen = get().openFiles ?? []
    // Keep existing tab order; only append when newly opened.
    const openFiles = currentOpen.includes(normalizedPath)
      ? currentOpen
      : [...currentOpen, normalizedPath].slice(0, 16)
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

  reorderTabs: async (fromIndex: number, toIndex: number) => {
    const config = get().config
    if (!config) {
      return
    }

    const openFiles = [...get().openFiles]
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= openFiles.length ||
      toIndex >= openFiles.length ||
      fromIndex === toIndex
    ) {
      return
    }

    const [moved] = openFiles.splice(fromIndex, 1)
    openFiles.splice(toIndex, 0, moved)

    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        openFiles,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig, openFiles })
  },

  closeOtherTabs: async (path: string) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const openFiles = [normalizedPath]
    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        activeFilePath: normalizedPath,
        openFiles,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig, openFiles, selectedFilePath: normalizedPath })
    await get().selectFile(normalizedPath)
  },

  closeTabsToTheRight: async (path: string) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const currentSelected = get().selectedFilePath
    const index = get().openFiles.indexOf(normalizedPath)
    if (index < 0) {
      return
    }

    const openFiles = get().openFiles.slice(0, index + 1)
    const selectedStillOpen = currentSelected ? openFiles.includes(currentSelected) : false
    const nextActive = selectedStillOpen ? currentSelected : normalizedPath

    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        activeFilePath: nextActive,
        openFiles,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig, openFiles, selectedFilePath: nextActive })
    if (nextActive && nextActive !== currentSelected) {
      await get().selectFile(nextActive)
    }
  },

  closeAllTabs: async () => {
    const config = get().config
    if (!config) {
      return
    }

    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        activeFilePath: null,
        openFiles: [],
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({
      config: nextConfig,
      openFiles: [],
      selectedFilePath: null,
      currentContent: "",
      dirty: false,
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
    const desiredName = name.includes(".") ? name : ensureFileExtension(name, "md")
    const fileName = await allocateUniqueFileName(basePath, desiredName)
    const nextPath = combinePaths(basePath, fileName)
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "md"
    const seedContent =
      extension === "json"
        ? "{\n  \n}\n"
        : extension === "xml"
          ? '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'
          : extension === "svg"
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">\n  <circle cx="60" cy="60" r="48" fill="#38bdf8" />\n</svg>\n'
            : ""

    await createFileEntry(nextPath)
    if (seedContent) {
      await writeTextFile(nextPath, seedContent)
    }
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
    const normalizedOld = oldPath.replace(/\\/g, "/")
    const normalizedNext = nextPath.replace(/\\/g, "/")

    await renameEntry(oldPath, nextPath)

    const { config, selectedFilePath, openFiles } = get()
    const nextOpenFiles = openFiles.map((item) => (item === normalizedOld ? normalizedNext : item))
    const nextSelected = selectedFilePath === normalizedOld ? normalizedNext : selectedFilePath

    if (config) {
      const nextConfig = {
        ...config,
        recentFiles: (config.recentFiles ?? []).map((item) => (item === normalizedOld ? normalizedNext : item)),
        uiState: {
          ...config.uiState,
          activeFilePath: nextSelected,
          openFiles: nextOpenFiles,
        },
      }
      await saveWorkspaceConfig(nextConfig)
      set({ config: nextConfig, openFiles: nextOpenFiles, selectedFilePath: nextSelected })
    }

    if (selectedFilePath === normalizedOld) {
      await get().selectFile(normalizedNext)
    }
    await get().refreshTree()
  },

  deleteNode: async (path) => {
    const normalizedPath = path.replace(/\\/g, "/")
    await deleteEntry(path)

    const { config, selectedFilePath, openFiles, currentContent } = get()
    const nextOpenFiles = openFiles.filter(
      (item) => item !== normalizedPath && !item.startsWith(`${normalizedPath}/`)
    )
    const selectedRemoved =
      selectedFilePath === normalizedPath ||
      (selectedFilePath?.startsWith(`${normalizedPath}/`) ?? false)
    const nextSelected = selectedRemoved
      ? nextOpenFiles[nextOpenFiles.length - 1] ?? null
      : selectedFilePath

    if (config) {
      const nextConfig = {
        ...config,
        recentFiles: (config.recentFiles ?? []).filter(
          (item) => item !== normalizedPath && !item.startsWith(`${normalizedPath}/`)
        ),
        uiState: {
          ...config.uiState,
          activeFilePath: nextSelected,
          openFiles: nextOpenFiles,
        },
      }
      await saveWorkspaceConfig(nextConfig)
      set({
        config: nextConfig,
        openFiles: nextOpenFiles,
        selectedFilePath: nextSelected,
        currentContent: selectedRemoved ? "" : currentContent,
        dirty: selectedRemoved ? false : get().dirty,
      })
    }

    if (nextSelected && selectedRemoved) {
      await get().selectFile(nextSelected)
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

  copyFileToDirectory: async (sourcePath, destinationDir) => {
    const config = get().config
    if (!config) {
      return null
    }

    const copiedPath = await copyFileEntry(sourcePath, destinationDir)
    await get().refreshTree()
    return copiedPath.replace(/\\/g, "/")
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
    const openFiles = get().openFiles.filter((item) => item !== normalizedPath)
    const nextActive =
      get().selectedFilePath === normalizedPath
        ? openFiles[openFiles.length - 1] ?? null
        : get().selectedFilePath && openFiles.includes(get().selectedFilePath)
          ? get().selectedFilePath
          : openFiles[openFiles.length - 1] ?? null

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
      set({ currentContent: "", dirty: false, selectedFilePath: null })
    }
  },
}))
