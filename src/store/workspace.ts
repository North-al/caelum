import { toast } from "sonner"

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
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
} from "~/lib/workspace"
import { isBinaryImagePath } from "~/lib/file-types"

import type { AppSettings, WorkspaceConfig } from "~/lib/workspace"
import type { FileNode } from "~/components/App/FileTree/types"

export type ViewMode = "editor" | "preview" | "split"

let autosaveTimer: number | null = null
let autosavePath: string | null = null
/** Latest content queued per path; drained sequentially to avoid lost writes. */
const pendingSaves = new Map<string, string>()
let saveDrainRunning = false

const contentForPath = (
  path: string,
  state: { selectedFilePath: string | null; currentContent: string; fileDrafts: Record<string, string> }
) => {
  if (state.selectedFilePath === path) {
    return state.currentContent
  }
  if (Object.prototype.hasOwnProperty.call(state.fileDrafts, path)) {
    return state.fileDrafts[path]
  }
  return null
}

const clearAutosaveTimer = () => {
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  autosavePath = null
}

const markPathClean = (
  path: string,
  writtenContent: string,
  get: () => WorkspaceState,
  set: (partial: Partial<WorkspaceState>) => void
) => {
  const state = get()
  const live = contentForPath(path, state)
  // Only clear dirty/draft when the buffer still matches what we wrote (no newer edits).
  if (live !== null && live !== writtenContent) {
    return
  }

  const fileDrafts = { ...state.fileDrafts }
  const dirtyFiles = { ...state.dirtyFiles }
  delete fileDrafts[path]
  delete dirtyFiles[path]
  const dirty = state.selectedFilePath
    ? Boolean(dirtyFiles[state.selectedFilePath])
    : Object.keys(dirtyFiles).length > 0
  set({ fileDrafts, dirtyFiles, dirty })
}

const drainPendingSaves = async (
  get: () => WorkspaceState,
  set: (partial: Partial<WorkspaceState>) => void
) => {
  if (saveDrainRunning) {
    return
  }
  saveDrainRunning = true
  set({ isSaving: true })
  try {
    while (pendingSaves.size > 0) {
      const path = pendingSaves.keys().next().value
      if (!path) {
        break
      }
      const content = pendingSaves.get(path)
      pendingSaves.delete(path)
      if (content === undefined) {
        continue
      }
      try {
        await writeTextFile(path, content)
        markPathClean(path, content, get, set)
      } catch (error) {
        toast.error("保存失败", {
          description: error instanceof Error ? error.message : "无法写入文件",
        })
      }
    }
  } finally {
    saveDrainRunning = false
    set({ isSaving: false })
    // New saves may have been queued while we were clearing isSaving.
    if (pendingSaves.size > 0) {
      void drainPendingSaves(get, set)
    }
  }
}

const enqueueSave = (
  path: string,
  content: string,
  get: () => WorkspaceState,
  set: (partial: Partial<WorkspaceState>) => void
) => {
  pendingSaves.set(path, content)
  void drainPendingSaves(get, set)
}

const scheduleAutosave = (
  path: string,
  get: () => WorkspaceState,
  set: (partial: Partial<WorkspaceState>) => void
) => {
  const autoSaveEnabled = get().config?.settings.autoSave ?? true
  const interval = get().config?.settings.autoSaveInterval ?? 600
  if (!autoSaveEnabled) {
    return
  }

  clearAutosaveTimer()
  autosavePath = path
  autosaveTimer = window.setTimeout(() => {
    const targetPath = autosavePath
    autosaveTimer = null
    autosavePath = null
    if (!targetPath) {
      return
    }
    const content = contentForPath(targetPath, get())
    if (content === null) {
      return
    }
    enqueueSave(targetPath, content, get, set)
  }, interval)
}

interface WorkspaceState {
  config: WorkspaceConfig | null
  tree: FileNode[]
  selectedFilePath: string | null
  currentContent: string
  dirty: boolean
  /** Per-path unsaved draft contents (survives tab switches). */
  fileDrafts: Record<string, string>
  /** Per-path dirty flags for tab indicators. */
  dirtyFiles: Record<string, boolean>
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
  fileDrafts: {} as Record<string, string>,
  dirtyFiles: {} as Record<string, boolean>,
  isLoading: false,
  isSaving: false,
  viewMode: "split" as ViewMode,
  sidebarCollapsed: false,
  outlineVisible: false,
  searchQuery: "",
  openFiles: [],
  initialized: false,
}

const pruneFileState = (
  drafts: Record<string, string>,
  dirtyFiles: Record<string, boolean>,
  keepPaths: string[]
) => {
  const keep = new Set(keepPaths.map((path) => path.replace(/\\/g, "/")))
  const nextDrafts: Record<string, string> = {}
  const nextDirty: Record<string, boolean> = {}
  for (const [path, content] of Object.entries(drafts)) {
    if (keep.has(path)) {
      nextDrafts[path] = content
    }
  }
  for (const [path, dirty] of Object.entries(dirtyFiles)) {
    if (keep.has(path) && dirty) {
      nextDirty[path] = true
    }
  }
  return { fileDrafts: nextDrafts, dirtyFiles: nextDirty }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...defaultState,

  initialize: async () => {
    // Settings ↔ Home remounts should not reload session or reopen closed tabs.
    if (get().initialized) {
      return
    }

    set({ isLoading: true })
    try {
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
          windowWidth: (() => {
            const width =
              config.uiState?.windowWidth && config.uiState.windowWidth > 0
                ? config.uiState.windowWidth
                : defaultUiState.windowWidth
            return width < MIN_WINDOW_WIDTH ? DEFAULT_WINDOW_WIDTH : width
          })(),
          windowHeight: (() => {
            const height =
              config.uiState?.windowHeight && config.uiState.windowHeight > 0
                ? config.uiState.windowHeight
                : defaultUiState.windowHeight
            return height < MIN_WINDOW_HEIGHT ? DEFAULT_WINDOW_HEIGHT : height
          })(),
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
    } catch (error) {
      set({ initialized: true, isLoading: false })
      toast.error("工作区加载失败", {
        description: error instanceof Error ? error.message : "无法读取工作区配置",
      })
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

    const previousPath = get().selectedFilePath
    let fileDrafts = { ...get().fileDrafts }
    let dirtyFiles = { ...get().dirtyFiles }

    // Flush pending autosave for the tab we are leaving so it cannot write the new file.
    if (previousPath && previousPath !== normalizedPath) {
      const leavingDirty = get().dirty || Boolean(dirtyFiles[previousPath])
      const leavingContent = get().currentContent
      if (autosavePath === previousPath) {
        clearAutosaveTimer()
      }
      if (leavingDirty) {
        fileDrafts[previousPath] = leavingContent
        dirtyFiles[previousPath] = true
        enqueueSave(previousPath, leavingContent, get, set)
      }
    }

    let content = ""
    let dirty = false
    if (dirtyFiles[normalizedPath] && fileDrafts[normalizedPath] !== undefined) {
      content = fileDrafts[normalizedPath]
      dirty = true
    } else if (!isBinaryImagePath(normalizedPath)) {
      try {
        content = await readTextFile(normalizedPath)
        delete fileDrafts[normalizedPath]
        delete dirtyFiles[normalizedPath]
      } catch (error) {
        toast.error("打开文件失败", {
          description: error instanceof Error ? error.message : "无法读取文件内容",
        })
        return
      }
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
      dirty,
      fileDrafts,
      dirtyFiles,
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
    const pruned = pruneFileState(get().fileDrafts, get().dirtyFiles, openFiles)
    const nextConfig = {
      ...config,
      uiState: {
        ...config.uiState,
        activeFilePath: normalizedPath,
        openFiles,
      },
    }

    await saveWorkspaceConfig(nextConfig)
    set({ config: nextConfig, openFiles, selectedFilePath: normalizedPath, ...pruned })
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
    const pruned = pruneFileState(get().fileDrafts, get().dirtyFiles, openFiles)
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
    set({ config: nextConfig, openFiles, selectedFilePath: nextActive, ...pruned })
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
      fileDrafts: {},
      dirtyFiles: {},
    })
  },

  updateContent: (content) => {
    const selectedFilePath = get().selectedFilePath
    if (selectedFilePath) {
      set({
        currentContent: content,
        dirty: true,
        fileDrafts: { ...get().fileDrafts, [selectedFilePath]: content },
        dirtyFiles: { ...get().dirtyFiles, [selectedFilePath]: true },
      })
      scheduleAutosave(selectedFilePath, get, set)
    } else {
      set({ currentContent: content, dirty: true })
    }
  },

  saveActiveFile: async () => {
    const selectedFilePath = get().selectedFilePath
    if (!selectedFilePath) {
      return
    }

    clearAutosaveTimer()
    const content = contentForPath(selectedFilePath, get())
    if (content === null) {
      return
    }
    enqueueSave(selectedFilePath, content, get, set)

    // Wait until this path is no longer queued and the drain loop is idle,
    // so Ctrl+S callers can await a durable write.
    while (pendingSaves.has(selectedFilePath) || saveDrainRunning) {
      await new Promise((resolve) => window.setTimeout(resolve, 16))
    }
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

    try {
      await createFileEntry(nextPath)
      if (seedContent) {
        await writeTextFile(nextPath, seedContent)
      }
    } catch (error) {
      toast.error("新建文件失败", {
        description: error instanceof Error ? error.message : "无法创建文件",
      })
      return null
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

    try {
      await createFolderEntry(nextPath)
    } catch (error) {
      toast.error("新建文件夹失败", {
        description: error instanceof Error ? error.message : "无法创建文件夹",
      })
      return
    }
    await get().refreshTree()
  },

  renameNode: async (oldPath, newName) => {
    const parentPath = getParentPath(oldPath)
    const nextPath = parentPath ? combinePaths(parentPath, newName) : newName
    const normalizedOld = oldPath.replace(/\\/g, "/")
    const normalizedNext = nextPath.replace(/\\/g, "/")

    try {
      await renameEntry(oldPath, nextPath)
    } catch (error) {
      toast.error("重命名失败", {
        description: error instanceof Error ? error.message : "无法重命名",
      })
      return
    }

    const { config, selectedFilePath, openFiles } = get()
    const nextOpenFiles = openFiles.map((item) => (item === normalizedOld ? normalizedNext : item))
    const nextSelected = selectedFilePath === normalizedOld ? normalizedNext : selectedFilePath
    const fileDrafts = { ...get().fileDrafts }
    const dirtyFiles = { ...get().dirtyFiles }
    if (fileDrafts[normalizedOld] !== undefined) {
      fileDrafts[normalizedNext] = fileDrafts[normalizedOld]
      delete fileDrafts[normalizedOld]
    }
    if (dirtyFiles[normalizedOld]) {
      dirtyFiles[normalizedNext] = true
      delete dirtyFiles[normalizedOld]
    }

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
      set({
        config: nextConfig,
        openFiles: nextOpenFiles,
        selectedFilePath: nextSelected,
        fileDrafts,
        dirtyFiles,
        dirty: nextSelected ? Boolean(dirtyFiles[nextSelected]) : false,
      })
    }

    if (selectedFilePath === normalizedOld) {
      await get().selectFile(normalizedNext)
    }
    await get().refreshTree()
  },

  deleteNode: async (path) => {
    const normalizedPath = path.replace(/\\/g, "/")
    try {
      await deleteEntry(path)
    } catch (error) {
      toast.error("删除失败", {
        description: error instanceof Error ? error.message : "无法删除",
      })
      return
    }

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
      const remainingReadingPositions = { ...config.uiState.readingPositions }
      for (const key of Object.keys(remainingReadingPositions)) {
        if (key === normalizedPath || key.startsWith(`${normalizedPath}/`)) {
          delete remainingReadingPositions[key]
        }
      }
      const nextConfig = {
        ...config,
        recentFiles: (config.recentFiles ?? []).filter(
          (item) => item !== normalizedPath && !item.startsWith(`${normalizedPath}/`)
        ),
        uiState: {
          ...config.uiState,
          activeFilePath: nextSelected,
          openFiles: nextOpenFiles,
          readingPositions: remainingReadingPositions,
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
    try {
      await moveEntry(oldPath, newPath)
    } catch (error) {
      toast.error("移动失败", {
        description: error instanceof Error ? error.message : "无法移动文件或文件夹",
      })
      return
    }
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

    try {
      const copiedPath = await copyFileEntry(sourcePath, destinationDir)
      await get().refreshTree()
      return copiedPath.replace(/\\/g, "/")
    } catch (error) {
      toast.error("复制失败", {
        description: error instanceof Error ? error.message : "无法复制文件",
      })
      return null
    }
  },

  refreshTree: async () => {
    const config = get().config
    if (!config) {
      return
    }

    try {
      const tree = await listNotesTree(config.notesPath)
      set({ tree })
    } catch (error) {
      toast.error("文件树刷新失败", {
        description: error instanceof Error ? error.message : "无法读取工作区目录",
      })
    }
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

  closeFileTab: async (path) => {
    const config = get().config
    if (!config) {
      return
    }

    const normalizedPath = path.replace(/\\/g, "/")
    const openFiles = get().openFiles.filter((item) => item !== normalizedPath)
    const currentSelected = get().selectedFilePath
    const nextActive =
      currentSelected === normalizedPath
        ? openFiles[openFiles.length - 1] ?? null
        : currentSelected && openFiles.includes(currentSelected)
          ? currentSelected
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
      ...pruneFileState(get().fileDrafts, get().dirtyFiles, openFiles),
    })

    if (nextActive) {
      await get().selectFile(nextActive)
    } else {
      set({ currentContent: "", dirty: false, selectedFilePath: null, fileDrafts: {}, dirtyFiles: {} })
    }
  },
}))
