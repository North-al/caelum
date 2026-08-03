import { useCallback, useEffect, useRef } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import type { GroupImperativeHandle } from "react-resizable-panels"
import type { EditorView } from "@codemirror/view"
import { FileUp, ImagePlus } from "lucide-react"
import { toast } from "sonner"

import { insertMarkdownAtCursor, MarkdownEditor } from "~/components/App/MarkdownEditor"
import { MarkdownPreview } from "~/components/App/MarkdownPreview"
import { OutlinePanel } from "~/components/App/OutlinePanel"
import { TitleBar } from "~/components/App/TitleBar"
import { WorkspaceSidebar } from "~/components/App/WorkspaceSidebar"
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from "~/components/ui/sidebar"
import { useFileDropOpen } from "~/hooks/use-file-drop-open"
import { useScrollSync } from "~/hooks/use-scroll-sync"
import { useWindowSizeMemory } from "~/hooks/use-window-size-memory"
import { buildImageMarkdown, importImageFromPath } from "~/lib/assets"
import { DEFAULT_OUTLINE_WIDTH, getLaunchFilePaths } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

const EDITOR_PANEL_ID = "editor"
const PREVIEW_PANEL_ID = "preview"
const OUTLINE_PANEL_ID = "outline"

const Home = () => {
  const {
    currentContent,
    initialize,
    updateContent,
    saveActiveFile,
    viewMode,
    selectedFilePath,
    config,
    updateUiState,
    setSidebarCollapsed,
    sidebarCollapsed,
    outlineVisible,
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

  const { isDragging, dragKind } = useFileDropOpen({
    enabled: true,
    onInsertImages: handleInsertDroppedImages,
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

  const refreshScrollEls = useCallback(() => {
    editorScrollElRef.current = editorViewRef.current?.scrollDOM ?? null
    previewScrollElRef.current = previewContainerRef.current
  }, [])

  useEffect(() => {
    if (scrollSyncEnabled && viewMode === "split") {
      refreshScrollEls()
    } else {
      editorScrollElRef.current = null
      previewScrollElRef.current = null
    }
  }, [scrollSyncEnabled, viewMode, currentContent, refreshScrollEls])

  useScrollSync({
    editorScrollEl: editorScrollElRef.current,
    previewScrollEl: previewScrollElRef.current,
    enabled: scrollSyncEnabled && viewMode === "split",
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

  const showEditor = viewMode !== "preview"
  const showPreview = viewMode !== "editor"
  const showSplitHandle = viewMode === "split"
  const showOutlineHandle = outlineVisible && showPreview

  const savedSplitRatio = Math.min(85, Math.max(15, config?.uiState.splitRatio ?? 50))
  const savedOutlineWidth = config?.uiState.outlineWidth || DEFAULT_OUTLINE_WIDTH
  const defaultEditorSize = viewMode === "preview" ? 0 : viewMode === "split" ? `${savedSplitRatio}` : "100"
  const defaultPreviewSize = viewMode === "editor" ? 0 : viewMode === "split" ? `${100 - savedSplitRatio}` : "100"

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
    >
      <Sidebar collapsible="icon" side="left" variant="sidebar">
        <WorkspaceSidebar />
      </Sidebar>
      <SidebarInset className="relative flex h-svh min-h-0 flex-col overflow-hidden p-0 md:rounded-none md:shadow-none">
        <TitleBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          {selectedFilePath && config ? (
            <Group
              key={`layout-${viewMode}-${outlineVisible ? "outline" : "plain"}`}
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
                  <MarkdownPreview
                    content={currentContent}
                    containerRef={previewContainerRef}
                    onScroll={(scrollTop) => queueReadingPositionSave({ previewScrollTop: scrollTop })}
                  />
                </Panel>
              ) : null}

              {showOutlineHandle ? (
                <Separator className="w-1.5 shrink-0 bg-border/40 transition-colors hover:bg-primary/20 data-[active]:bg-primary/30" />
              ) : null}

              {outlineVisible && showPreview ? (
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
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileUp className="size-5" />
              </div>
              <div className="text-sm font-medium text-foreground/80">选择左侧文件开始编辑</div>
              <div className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                也可将 `.md` / `.txt` 文件拖拽到窗口中直接打开预览
              </div>
            </div>
          )}
        </div>

        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-background/95 px-10 py-8 shadow-xl">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {dragKind === "image" ? <ImagePlus className="size-6" /> : <FileUp className="size-6" />}
              </div>
              <div className="text-sm font-semibold tracking-tight">
                {dragKind === "image" ? "松开以插入图片" : "松开以打开预览"}
              </div>
              <div className="text-xs text-muted-foreground">
                {dragKind === "image"
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
