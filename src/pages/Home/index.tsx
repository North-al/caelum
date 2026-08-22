import { useCallback, useEffect, useRef, useState } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import type { GroupImperativeHandle } from "react-resizable-panels"
import type { EditorView } from "@codemirror/view"
import { FileUp, ImagePlus, Link2 } from "lucide-react"
import { toast } from "sonner"

import { CodePreview } from "~/components/App/CodePreview"
import { ImagePreview } from "~/components/App/ImagePreview"
import { insertMarkdownAtCursor, MarkdownEditor } from "~/components/App/MarkdownEditor"
import { MarkdownPreview } from "~/components/App/MarkdownPreview"
import { OutlinePanel } from "~/components/App/OutlinePanel"
import { QuickOpen } from "~/components/App/QuickOpen"
import { TitleBar } from "~/components/App/TitleBar"
import { WelcomeEmptyState } from "~/components/App/WelcomeEmptyState"
import { WorkspaceSidebar } from "~/components/App/WorkspaceSidebar"
import { PageLoading } from "~/components/PageLoading"
import { Button } from "~/components/ui/button"
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from "~/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { useFileDropOpen } from "~/hooks/use-file-drop-open"
import { useScrollSync } from "~/hooks/use-scroll-sync"
import { buildImageMarkdown, importImageFromPath } from "~/lib/assets"
import { getPreviewKind, isBinaryImagePath, isMarkdownPath } from "~/lib/file-types"
import { DEFAULT_OUTLINE_WIDTH } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

const EDITOR_PANEL_ID = "editor"
const PREVIEW_PANEL_ID = "preview"
const OUTLINE_PANEL_ID = "outline"

const Home = () => {
  const {
    currentContent,
    updateContent,
    saveActiveFile,
    viewMode,
    setViewMode,
    selectedFilePath,
    config,
    updateUiState,
    updateSettings,
    setSidebarCollapsed,
    sidebarCollapsed,
    outlineVisible,
    isLoading,
    initialized,
  } = useWorkspaceStore()

  const editorViewRef = useRef<EditorView | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const editorScrollElRef = useRef<HTMLElement | null>(null)
  const groupRef = useRef<GroupImperativeHandle | null>(null)
  const scrollSaveTimerRef = useRef<number | null>(null)
  const outlineSaveTimerRef = useRef<number | null>(null)
  const splitSaveTimerRef = useRef<number | null>(null)
  const layoutSaveReadyRef = useRef(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const lastShiftAtRef = useRef(0)

  const scrollSyncEnabled = config?.settings.scrollSync ?? true
  const splitOrientation = config?.uiState.splitOrientation ?? "horizontal"
  const sidebarOpen = !sidebarCollapsed

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

  const previewKind = selectedFilePath ? getPreviewKind(selectedFilePath) : "markdown"
  const isImageFile = selectedFilePath ? isBinaryImagePath(selectedFilePath) : false
  const isMarkdownFile = selectedFilePath ? isMarkdownPath(selectedFilePath) : false
  const showEditor = !isImageFile && viewMode !== "preview"
  const showPreview = isImageFile || viewMode !== "editor"
  const showSplitHandle = !isImageFile && viewMode === "split"
  const showOutlineHandle = outlineVisible && showPreview && isMarkdownFile && !isImageFile

  const refreshScrollEls = useCallback(() => {
    editorScrollElRef.current = editorViewRef.current?.scrollDOM ?? null
  }, [])

  useEffect(() => {
    if (scrollSyncEnabled && viewMode === "split" && !isImageFile) {
      refreshScrollEls()
    }
  }, [
    scrollSyncEnabled,
    viewMode,
    currentContent,
    refreshScrollEls,
    isImageFile,
    selectedFilePath,
    splitOrientation,
    outlineVisible,
    showOutlineHandle,
  ])

  const scrollSyncRevision = [
    viewMode,
    selectedFilePath ?? "",
    splitOrientation,
    showEditor ? 1 : 0,
    showPreview ? 1 : 0,
    showOutlineHandle ? 1 : 0,
    outlineVisible ? 1 : 0,
    currentContent.length,
  ].join(":")

  useScrollSync({
    editorRef: editorScrollElRef,
    previewRef: previewContainerRef,
    enabled: scrollSyncEnabled && viewMode === "split" && !isImageFile,
    revision: scrollSyncRevision,
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
  }, [saveActiveFile, selectedFilePath])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void handleSave()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault()
        const mode = useWorkspaceStore.getState().viewMode
        if (mode === "editor") {
          setViewMode("split")
        } else {
          setViewMode("editor")
        }
        return
      }

      // Alt + ← / → 切换标签
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        const { openFiles, selectedFilePath, selectFile } = useWorkspaceStore.getState()
        if (openFiles.length < 2) {
          return
        }
        event.preventDefault()
        const current = selectedFilePath?.replace(/\\/g, "/") ?? ""
        const index = Math.max(
          0,
          openFiles.findIndex((path) => path.replace(/\\/g, "/") === current)
        )
        const nextIndex =
          event.key === "ArrowRight"
            ? (index + 1) % openFiles.length
            : (index - 1 + openFiles.length) % openFiles.length
        void selectFile(openFiles[nextIndex])
        return
      }

      // Double-tap Shift → Quick Open (IDEA-style), ignore held Shift repeat.
      if (event.key === "Shift" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now()
        if (now - lastShiftAtRef.current < 400) {
          event.preventDefault()
          lastShiftAtRef.current = 0
          setQuickOpen(true)
          return
        }
        lastShiftAtRef.current = now
        return
      }
      if (event.key !== "Shift") {
        lastShiftAtRef.current = 0
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave, setViewMode])

  const handleEditorCreate = useCallback(
    (view: EditorView) => {
      editorViewRef.current = view
      editorScrollElRef.current = view.scrollDOM
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
  }, [viewMode, outlineVisible, selectedFilePath, splitOrientation])

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

  const groupOrientation =
    viewMode === "split" && splitOrientation === "vertical" && !showOutlineHandle
      ? "vertical"
      : "horizontal"

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarCollapsed(!open)
      }}
      className="workspace-shell bg-transparent"
    >
      <Sidebar
        collapsible="icon"
        side="left"
        variant="sidebar"
        className="border-r border-border/40 transition-[width] duration-200 ease-out"
      >
        <WorkspaceSidebar />
      </Sidebar>
      <SidebarInset className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-transparent p-0 md:rounded-none md:shadow-none">
        <TitleBar />
        <div className="workspace-main relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {!initialized || isLoading ? (
            <PageLoading scene="workspace" />
          ) : selectedFilePath && config ? (
            <Group
              key={`layout-${viewMode}-${splitOrientation}-${outlineVisible ? "outline" : "plain"}-${previewKind}`}
              groupRef={groupRef}
              orientation={groupOrientation}
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
                <Separator
                  className={cn(
                    "shrink-0 bg-border/50 transition-colors hover:bg-primary/25 data-[active]:bg-primary/35",
                    groupOrientation === "vertical" ? "h-px w-full" : "w-px"
                  )}
                />
              ) : null}

              {showPreview ? (
                <Panel
                  id={PREVIEW_PANEL_ID}
                  defaultSize={defaultPreviewSize}
                  minSize={showSplitHandle ? "20" : outlineVisible ? 200 : "100"}
                  className={cn(
                    "overflow-hidden",
                    groupOrientation === "horizontal" && "border-l border-border/40",
                    groupOrientation === "vertical" && "border-t border-border/40"
                  )}
                  style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
                >
                  {!isImageFile && viewMode === "split" ? (
                    <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-b border-border/40 bg-muted/15 px-2">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 gap-1 rounded-md px-2 text-[11px]",
                                scrollSyncEnabled
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground"
                              )}
                              onClick={() => void updateSettings({ scrollSync: !scrollSyncEnabled })}
                            />
                          }
                        >
                          <Link2 className="size-3" strokeWidth={1.75} />
                          同步滚动
                        </TooltipTrigger>
                        <TooltipContent side="bottom">双区联动滚动</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : null}
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {isImageFile ? (
                      <ImagePreview path={selectedFilePath} />
                    ) : isMarkdownFile ? (
                      <MarkdownPreview
                        content={currentContent}
                        containerRef={previewContainerRef}
                        onScroll={(scrollTop) => queueReadingPositionSave({ previewScrollTop: scrollTop })}
                      />
                    ) : (
                      <CodePreview
                        path={selectedFilePath}
                        content={currentContent}
                        containerRef={previewContainerRef}
                        onScroll={(scrollTop) => queueReadingPositionSave({ previewScrollTop: scrollTop })}
                      />
                    )}
                  </div>
                </Panel>
              ) : null}

              {showOutlineHandle ? (
                <Separator className="w-px shrink-0 bg-border/50 transition-colors hover:bg-primary/25 data-[active]:bg-primary/35" />
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
            <WelcomeEmptyState />
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
                  ? "将复制文本 / 配置 / 源码文件到当前工作区"
                  : dragKind === "image"
                    ? "图片将复制到 assets 并以相对路径写入 Markdown"
                    : dragKind === "unsupported"
                      ? "当前不支持该类型文件打开"
                      : "支持 Markdown、配置与常见源码文本"}
              </div>
            </div>
          </div>
        ) : null}

        <QuickOpen open={quickOpen} onOpenChange={setQuickOpen} />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Home
