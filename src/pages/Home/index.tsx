import { useCallback, useEffect, useRef } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import type { GroupImperativeHandle } from "react-resizable-panels"
import type { EditorView } from "@codemirror/view"
import { listen } from "@tauri-apps/api/event"
import { FilePlus2, FileUp, ImagePlus, Settings2 } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { CaelumLogo } from "~/components/App/CaelumLogo"
import { CodePreview } from "~/components/App/CodePreview"
import { ImagePreview } from "~/components/App/ImagePreview"
import { insertMarkdownAtCursor, MarkdownEditor } from "~/components/App/MarkdownEditor"
import { MarkdownPreview } from "~/components/App/MarkdownPreview"
import { OutlinePanel } from "~/components/App/OutlinePanel"
import { TitleBar } from "~/components/App/TitleBar"
import { WorkspaceSidebar } from "~/components/App/WorkspaceSidebar"
import { PageLoading } from "~/components/PageLoading"
import { Button } from "~/components/ui/button"
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from "~/components/ui/sidebar"
import { useFileDropOpen } from "~/hooks/use-file-drop-open"
import { useScrollSync } from "~/hooks/use-scroll-sync"
import { useWindowSizeMemory } from "~/hooks/use-window-size-memory"
import { buildImageMarkdown, importImageFromPath } from "~/lib/assets"
import { getPreviewKind, isBinaryImagePath, isMarkdownPath } from "~/lib/file-types"
import { DEFAULT_OUTLINE_WIDTH, getLaunchFilePaths } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

const EDITOR_PANEL_ID = "editor"
const PREVIEW_PANEL_ID = "preview"
const OUTLINE_PANEL_ID = "outline"

const Home = () => {
  const navigate = useNavigate()
  const {
    currentContent,
    initialize,
    updateContent,
    saveActiveFile,
    createFile,
    viewMode,
    selectedFilePath,
    config,
    updateUiState,
    setSidebarCollapsed,
    sidebarCollapsed,
    outlineVisible,
    isLoading,
    initialized,
  } = useWorkspaceStore()

  const editorViewRef = useRef<EditorView | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const editorScrollElRef = useRef<HTMLElement | null>(null)
  const previewScrollElRef = useRef<HTMLElement | null>(null)
  const groupRef = useRef<GroupImperativeHandle | null>(null)
  const scrollSaveTimerRef = useRef<number | null>(null)
  const outlineSaveTimerRef = useRef<number | null>(null)
  const splitSaveTimerRef = useRef<number | null>(null)
  const layoutSaveReadyRef = useRef(false)

  const scrollSyncEnabled = config?.settings.scrollSync ?? false

  const handleInsertDroppedImages = useCallback(
    async (paths: string[]) => {
      const assetsPath = useWorkspaceStore.getState().config?.assetsPath
      const activePath = useWorkspaceStore.getState().selectedFilePath
      if (!assetsPath || !activePath) {
        toast.error("请先打开一篇笔记再插入图片")
        return
      }

      for (const sourcePath of paths) {
        const absolutePath = await importImageFromPath({ assetsPath, sourcePath })
        const markdown = buildImageMarkdown({
          markdownFilePath: activePath,
          assetAbsolutePath: absolutePath,
          alt: sourcePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "",
        })
        if (editorViewRef.current) {
          insertMarkdownAtCursor(editorViewRef.current, markdown)
        } else {
          const current = useWorkspaceStore.getState().currentContent
          useWorkspaceStore.getState().updateContent(
            `${current}${current.endsWith("\n") || !current ? "" : "\n"}${markdown}\n`
          )
        }
      }
      toast.success(paths.length === 1 ? "图片已插入" : `已插入 ${paths.length} 张图片`)
    },
    []
  )

  const handleImportNotesToExplorer = useCallback(async (paths: string[], destinationDir: string) => {
    const copyFileToDirectory = useWorkspaceStore.getState().copyFileToDirectory
    let lastCopied: string | null = null
    for (const sourcePath of paths) {
      lastCopied = await copyFileToDirectory(sourcePath, destinationDir)
    }
    toast.success(paths.length === 1 ? "已导入到资源管理器" : `已导入 ${paths.length} 个文件`, {
      description: lastCopied?.split(/[\\/]/).pop(),
    })
  }, [])

  const { isDragging, dragKind, dropZone } = useFileDropOpen({
    enabled: true,
    onInsertImages: handleInsertDroppedImages,
    onImportNotesToExplorer: handleImportNotesToExplorer,
  })
  useWindowSizeMemory()

  useEffect(() => {
    void (async () => {
      await initialize()
      try {
        const launchPaths = await getLaunchFilePaths()
        if (launchPaths.length === 0) {
          return
        }
        const { selectFile, setViewMode } = useWorkspaceStore.getState()
        setViewMode("preview")
        for (const path of launchPaths) {
          await selectFile(path.replace(/\\/g, "/"))
        }
        await selectFile(launchPaths[0].replace(/\\/g, "/"))
      } catch {
        // Browser / non-Tauri preview ignores launch args.
      }
    })()
  }, [initialize])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void listen<string[]>("open-files", (event) => {
      const paths = (event.payload ?? []).map((path) => path.replace(/\\/g, "/")).filter(Boolean)
      if (paths.length === 0) {
        return
      }
      void (async () => {
        const { selectFile, setViewMode } = useWorkspaceStore.getState()
        setViewMode("preview")
        for (const path of paths) {
          await selectFile(path)
        }
        await selectFile(paths[0])
      })()
    }).then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  }, [])

  const previewKind = selectedFilePath ? getPreviewKind(selectedFilePath) : "markdown"
  const isImageFile = selectedFilePath ? isBinaryImagePath(selectedFilePath) : false
  const isMarkdownFile = selectedFilePath ? isMarkdownPath(selectedFilePath) : false
  const showEditor = !isImageFile && viewMode !== "preview"
  const showPreview = isImageFile || viewMode !== "editor"
  const showSplitHandle = !isImageFile && viewMode === "split"
  const showOutlineHandle = outlineVisible && showPreview && isMarkdownFile && !isImageFile

  const refreshScrollEls = useCallback(() => {
    editorScrollElRef.current = editorViewRef.current?.scrollDOM ?? null
    previewScrollElRef.current = previewContainerRef.current
  }, [])

  useEffect(() => {
    if (scrollSyncEnabled && viewMode === "split" && isMarkdownFile) {
      refreshScrollEls()
    } else {
      editorScrollElRef.current = null
      previewScrollElRef.current = null
    }
  }, [scrollSyncEnabled, viewMode, currentContent, refreshScrollEls, isMarkdownFile])

  useScrollSync({
    editorScrollEl: editorScrollElRef.current,
    previewScrollEl: previewScrollElRef.current,
    enabled: scrollSyncEnabled && viewMode === "split" && isMarkdownFile,
  })
  useEffect(() => {
    if (!selectedFilePath) {
      return
    }

    const savedPosition = config?.uiState.readingPositions[selectedFilePath]
    if (!savedPosition) {
      return
    }

    if (editorViewRef.current) {
      editorViewRef.current.scrollDOM.scrollTop = savedPosition.editorScrollTop
    }

    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = savedPosition.previewScrollTop
    }
  }, [config?.uiState.readingPositions, selectedFilePath, viewMode])

  const queueReadingPositionSave = useCallback(
    (patch: Partial<{ editorScrollTop: number; previewScrollTop: number }>) => {
      const latestState = useWorkspaceStore.getState()
      const activePath = latestState.selectedFilePath

      if (!activePath) {
        return
      }

      if (scrollSaveTimerRef.current) {
        window.clearTimeout(scrollSaveTimerRef.current)
      }

      scrollSaveTimerRef.current = window.setTimeout(() => {
        void updateUiState({
          readingPositions: {
            ...(latestState.config?.uiState.readingPositions ?? {}),
            [activePath]: {
              editorScrollTop: editorViewRef.current?.scrollDOM.scrollTop ?? 0,
              previewScrollTop: previewContainerRef.current?.scrollTop ?? 0,
              ...patch,
            },
          },
        })
      }, 250)
    },
    [updateUiState]
  )

  const handleLayoutChanged = useCallback(
    (layout: { [panelId: string]: number }) => {
      if (!layoutSaveReadyRef.current || viewMode !== "split") {
        return
      }

      const editorSize = layout[EDITOR_PANEL_ID]
      const previewSize = layout[PREVIEW_PANEL_ID]
      if (typeof editorSize !== "number" || typeof previewSize !== "number") {
        return
      }

      const total = editorSize + previewSize
      if (total <= 0) {
        return
      }

      const ratio = Math.round((editorSize / total) * 100)
      if (!Number.isFinite(ratio) || ratio < 15 || ratio > 85) {
        return
      }

      if (splitSaveTimerRef.current) {
        window.clearTimeout(splitSaveTimerRef.current)
      }
      splitSaveTimerRef.current = window.setTimeout(() => {
        const current = useWorkspaceStore.getState().config?.uiState.splitRatio ?? 50
        if (current === ratio) {
          return
        }
        void updateUiState({ splitRatio: ratio })
      }, 300)
    },
    [updateUiState, viewMode]
  )

  const handleOutlineSelect = useCallback((id: string) => {
    const container = previewContainerRef.current
    if (!container) {
      return
    }
    const target = container.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null
    if (target) {
      container.scrollTo({ top: target.offsetTop - 16, behavior: "smooth" })
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedFilePath) {
      return
    }
    await saveActiveFile()
    toast.success("已保存", { description: selectedFilePath?.split(/[\\/]/).pop() })
  }, [saveActiveFile, selectedFilePath])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave])

  const handleEditorCreate = useCallback(
    (view: EditorView) => {
      editorViewRef.current = view
      const activePath = useWorkspaceStore.getState().selectedFilePath
      const savedPosition = activePath
        ? useWorkspaceStore.getState().config?.uiState.readingPositions[activePath]
        : undefined

      if (savedPosition) {
        view.scrollDOM.scrollTop = savedPosition.editorScrollTop
      }

      view.scrollDOM.addEventListener("scroll", () => {
        queueReadingPositionSave({ editorScrollTop: view.scrollDOM.scrollTop })
      })
    },
    [queueReadingPositionSave]
  )

  const savedSplitRatio = Math.min(85, Math.max(15, config?.uiState.splitRatio ?? 50))
  const savedOutlineWidth = config?.uiState.outlineWidth || DEFAULT_OUTLINE_WIDTH
  const defaultEditorSize =
    isImageFile || viewMode === "preview" ? 0 : viewMode === "split" ? `${savedSplitRatio}` : "100"
  const defaultPreviewSize =
    !isImageFile && viewMode === "editor" ? 0 : viewMode === "split" && !isImageFile ? `${100 - savedSplitRatio}` : "100"

  useEffect(() => {
    layoutSaveReadyRef.current = false
    const timer = window.setTimeout(() => {
      layoutSaveReadyRef.current = true
    }, 450)
    return () => window.clearTimeout(timer)
  }, [viewMode, outlineVisible, selectedFilePath])

  const handleOutlineResize = useCallback(
    (panelSize: { asPercentage: number; inPixels: number }) => {
      if (!layoutSaveReadyRef.current) {
        return
      }
      const width = Math.round(panelSize.inPixels)
      if (width < 160 || width > 480) {
        return
      }
      if (outlineSaveTimerRef.current) {
        window.clearTimeout(outlineSaveTimerRef.current)
      }
      outlineSaveTimerRef.current = window.setTimeout(() => {
        const current = useWorkspaceStore.getState().config?.uiState.outlineWidth || DEFAULT_OUTLINE_WIDTH
        if (current === width) {
          return
        }
        void updateUiState({ outlineWidth: width })
      }, 300)
    },
    [updateUiState]
  )

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      className="bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--primary)_8%,transparent),_transparent_55%),var(--background)]"
    >
      <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r border-border/50">
        <WorkspaceSidebar />
      </Sidebar>
      <SidebarInset className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-background p-0 md:rounded-none md:shadow-none">
        <TitleBar />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
          {!initialized || isLoading ? (
            <PageLoading label="正在打开工作区…" />
          ) : selectedFilePath && config ? (
            <Group
              key={`layout-${viewMode}-${outlineVisible ? "outline" : "plain"}-${previewKind}`}
              groupRef={groupRef}
              orientation="horizontal"
              className="h-full min-h-0 w-full"
              onLayoutChanged={handleLayoutChanged}
            >
              {showEditor ? (
                <Panel
                  id={EDITOR_PANEL_ID}
                  defaultSize={defaultEditorSize}
                  minSize={showSplitHandle ? "20" : "100"}
                  className="overflow-hidden"
                  style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
                >
                  <MarkdownEditor
                    value={currentContent}
                    onChange={(value) => updateContent(value)}
                    onCreateEditor={handleEditorCreate}
                  />
                </Panel>
              ) : null}

              {showSplitHandle ? (
                <Separator className="w-1.5 shrink-0 bg-border/40 transition-colors hover:bg-primary/20 data-[active]:bg-primary/30" />
              ) : null}

              {showPreview ? (
                <Panel
                  id={PREVIEW_PANEL_ID}
                  defaultSize={defaultPreviewSize}
                  minSize={showSplitHandle ? "20" : outlineVisible ? 200 : "100"}
                  className="overflow-hidden border-l border-border/40"
                  style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
                >
                  {isImageFile ? (
                    <ImagePreview path={selectedFilePath} />
                  ) : isMarkdownFile ? (
                    <MarkdownPreview
                      content={currentContent}
                      containerRef={previewContainerRef}
                      onScroll={(scrollTop) => queueReadingPositionSave({ previewScrollTop: scrollTop })}
                    />
                  ) : (
                    <CodePreview path={selectedFilePath} content={currentContent} />
                  )}
                </Panel>
              ) : null}

              {showOutlineHandle ? (
                <Separator className="w-1.5 shrink-0 bg-border/40 transition-colors hover:bg-primary/20 data-[active]:bg-primary/30" />
              ) : null}

              {showOutlineHandle ? (
                <Panel
                  id={OUTLINE_PANEL_ID}
                  defaultSize={`${savedOutlineWidth}px`}
                  minSize={160}
                  maxSize={420}
                  className="overflow-hidden border-l border-border/40"
                  style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
                  onResize={handleOutlineResize}
                >
                  <OutlinePanel content={currentContent} onSelectHeading={handleOutlineSelect} />
                </Panel>
              ) : null}
            </Group>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8">
              <div className="w-full max-w-md rounded-2xl border border-border/50 bg-background/60 p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <CaelumLogo className="size-8" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">开始写作</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  从左侧选择笔记，或新建一篇 Markdown。也可将 `.md` / `.txt` 拖入窗口打开。
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-full shadow-sm shadow-primary/20"
                    onClick={() => {
                      void createFile("note.md").catch((error) => {
                        toast.error("创建失败", {
                          description: error instanceof Error ? error.message : "无法创建文件",
                        })
                      })
                    }}
                  >
                    <FilePlus2 className="mr-1.5 size-3.5" />
                    新建笔记
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings2 className="mr-1.5 size-3.5" />
                    打开设置
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-card/95 px-10 py-8 shadow-xl backdrop-blur-sm">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                {dropZone === "explorer" ? (
                  <FileUp className="size-6" />
                ) : dragKind === "image" ? (
                  <ImagePlus className="size-6" />
                ) : (
                  <FileUp className="size-6" />
                )}
              </div>
              <div className="text-sm font-semibold tracking-tight">
                {dropZone === "explorer"
                  ? "松开以导入到资源管理器"
                  : dragKind === "image"
                    ? "松开以插入图片"
                    : "松开以打开预览"}
              </div>
              <div className="text-xs text-muted-foreground">
                {dropZone === "explorer"
                  ? "将复制 .md / .txt 到当前工作区"
                  : dragKind === "image"
                    ? "图片将复制到 assets 并以相对路径写入 Markdown"
                    : "支持 Markdown（.md）与文本（.txt）"}
              </div>
            </div>
          </div>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Home
