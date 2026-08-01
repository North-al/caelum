import { useEffect, useMemo, useRef } from "react"
import { Eye, PenSquare, Save, Settings2, SplitSquareHorizontal, X } from "lucide-react"
import { useNavigate } from "react-router"
import type { EditorView } from "@codemirror/view"

import { MarkdownEditor } from "~/components/App/MarkdownEditor"
import { MarkdownPreview } from "~/components/App/MarkdownPreview"
import { SplitPanel } from "~/components/App/SplitPanel"
import { TitleBar } from "~/components/App/TitleBar"
import { WorkspaceSidebar } from "~/components/App/WorkspaceSidebar"
import { Button } from "~/components/ui/button"
import { useWorkspaceStore } from "~/store/workspace"

const fileNameFromPath = (value: string) => value.split(/[\\/]/).pop() ?? value

const formatPathLabel = (filePath: string | null, rootPath?: string) => {
  if (!filePath) {
    return "未打开文件"
  }

  const fileName = fileNameFromPath(filePath)
  if (!rootPath) {
    return fileName
  }

  const normalizedFilePath = filePath.replace(/\\/g, "/")
  const normalizedRoot = rootPath.replace(/\\/g, "/").replace(/\/+$/, "")
  const relativePath = normalizedFilePath.startsWith(normalizedRoot)
    ? normalizedFilePath.slice(normalizedRoot.length).replace(/^\/+/, "")
    : normalizedFilePath
  const parentPath = relativePath.includes("/") ? relativePath.slice(0, relativePath.lastIndexOf("/")) : ""

  return parentPath ? `${parentPath} · ${fileName}` : fileName
}

const Home = () => {
  const {
    currentContent,
    dirty,
    initialize,
    updateContent,
    saveActiveFile,
    viewMode,
    setViewMode,
    selectedFilePath,
    config,
    openFiles,
    selectFile,
    closeFileTab,
    updateUiState,
  } = useWorkspaceStore()
  const navigate = useNavigate()
  const editorViewRef = useRef<EditorView | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const scrollSaveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    void initialize()
  }, [initialize])

  const currentPathLabel = useMemo(
    () => formatPathLabel(selectedFilePath, config?.notesPath),
    [config?.notesPath, selectedFilePath]
  )

  const openTabs = openFiles.length > 0 ? openFiles : selectedFilePath ? [selectedFilePath] : []

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

  const queueReadingPositionSave = (patch: Partial<{ editorScrollTop: number; previewScrollTop: number }>) => {
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
  }

  const editorSurface = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" title={selectedFilePath ?? ""}>
            {currentPathLabel}
          </div>
          <div className="text-xs text-muted-foreground">
            {config?.settings.autoSave ? "自动保存已开启" : "自动保存已关闭"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={viewMode === "editor" ? "default" : "outline"} size="sm" onClick={() => setViewMode("editor")}>
            <PenSquare className="mr-1 size-4" />
            编辑
          </Button>
          <Button variant={viewMode === "preview" ? "default" : "outline"} size="sm" onClick={() => setViewMode("preview")}>
            <Eye className="mr-1 size-4" />
            预览
          </Button>
          <Button variant={viewMode === "split" ? "default" : "outline"} size="sm" onClick={() => setViewMode("split")}>
            <SplitSquareHorizontal className="mr-1 size-4" />
            分屏
          </Button>
          <Button variant="outline" size="sm" onClick={() => void saveActiveFile()}>
            <Save className="mr-1 size-4" />
            {dirty ? "保存*" : "保存"}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/settings")}>
            <Settings2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {openTabs.map((filePath) => {
            const active = selectedFilePath === filePath
            return (
              <button
                key={filePath}
                type="button"
                title={filePath}
                className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary/25 bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                onClick={() => void selectFile(filePath)}
              >
                <span className="max-w-[180px] truncate">{fileNameFromPath(filePath)}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation()
                    void closeFileTab(filePath)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.stopPropagation()
                      void closeFileTab(filePath)
                    }
                  }}
                >
                  <X className="size-3.5" />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4">
        <MarkdownEditor
          value={currentContent}
          onChange={(value) => updateContent(value)}
          onCreateEditor={(view) => {
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
          }}
        />
      </div>
    </div>
  )

  const previewSurface = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <div className="text-sm font-medium">预览</div>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <MarkdownPreview
          content={currentContent}
          containerRef={previewContainerRef}
          onScroll={(scrollTop) => queueReadingPositionSave({ previewScrollTop: scrollTop })}
        />
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <TitleBar />
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="w-[300px] min-w-[260px] overflow-hidden rounded-2xl border border-border/60 bg-sidebar/80">
          <WorkspaceSidebar />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/80">
          {viewMode === "editor" ? (
            editorSurface
          ) : viewMode === "preview" ? (
            previewSurface
          ) : (
            <SplitPanel
              left={editorSurface}
              right={previewSurface}
              initialRatio={config?.uiState.splitRatio ?? 50}
              onRatioChange={(ratio) => void updateUiState({ splitRatio: ratio })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
