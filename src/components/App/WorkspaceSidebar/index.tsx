import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownAZ,
  ArrowUpAZ,
  FolderTree,
  RefreshCw,
  Search,
  SlidersHorizontal,
  StickyNote,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"

import { AppearanceMenu } from "~/components/App/AppearanceMenu"
import { CaelumLogo } from "~/components/App/CaelumLogo"
import { FileTree } from "~/components/App/FileTree"
import { InputDialog } from "~/components/App/InputDialog"
import { RenameDialog } from "~/components/App/RenameDialog"
import { Button } from "~/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarSeparator,
  useSidebar,
} from "~/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { getFileExtension } from "~/lib/file-types"
import { EXPLORER_ZONE_ATTR } from "~/lib/dnd"
import { SUPPORTED_RENAME_EXTENSIONS } from "~/lib/rename"
import { writeTextToClipboard } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

import type { FileNode } from "~/components/App/FileTree/types"

type CreateKind = "file" | "folder"
type SortMode = "name-asc" | "name-desc" | "type"

interface CreateTarget {
  kind: CreateKind
  parentPath?: string
}

const CREATE_EXTENSIONS = SUPPORTED_RENAME_EXTENSIONS.map((item) => ({
  label: `.${item}`,
  value: item,
}))

const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return nodes
  }

  return nodes.reduce<FileNode[]>((accumulator, node) => {
    const matchesName = node.name.toLowerCase().includes(normalized)
    const matchingChildren = node.children ? filterTree(node.children, normalized) : []

    if (matchesName || matchingChildren.length > 0) {
      accumulator.push({
        ...node,
        children: matchingChildren,
      })
    }

    return accumulator
  }, [])
}

const sortTree = (nodes: FileNode[], mode: SortMode): FileNode[] => {
  const copy = nodes.map((node) => ({
    ...node,
    children: node.children ? sortTree(node.children, mode) : node.children,
  }))

  copy.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1
    }
    if (mode === "type" && a.type === "file" && b.type === "file") {
      const ext = getFileExtension(a.name).localeCompare(getFileExtension(b.name), "zh")
      if (ext !== 0) {
        return ext
      }
    }
    const byName = a.name.localeCompare(b.name, "zh", { sensitivity: "base" })
    return mode === "name-desc" ? -byName : byName
  })

  return copy
}

const parentLabel = (parentPath?: string, notesPath?: string) => {
  if (!parentPath || parentPath === notesPath) {
    return "工作区根目录"
  }
  return parentPath.split(/[\\/]/).pop() ?? parentPath
}

export const WorkspaceSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const onBoard = location.pathname === "/board"

  const {
    config,
    tree,
    selectedFilePath,
    searchQuery,
    setSearchQuery,
    createFile,
    createFolder,
    selectFile,
    renameNode,
    deleteNode,
    copyFileToDirectory,
    setSidebarCollapsed,
    refreshTree,
  } = useWorkspaceStore()

  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ path: string; isFolder: boolean } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("name-asc")
  const [refreshing, setRefreshing] = useState(false)

  const filteredTree = useMemo(() => {
    const filtered = filterTree(tree, searchQuery)
    return sortTree(filtered, sortMode)
  }, [searchQuery, sortMode, tree])

  const notesPath = config?.notesPath
  const hasNoResults = Boolean(searchQuery.trim()) && filteredTree.length === 0 && tree.length > 0

  const handleCreate = async (name: string) => {
    if (!createTarget) {
      return
    }
    const parentPath = createTarget.parentPath || notesPath
    if (createTarget.kind === "file") {
      await createFile(name, parentPath)
    } else {
      await createFolder(name, parentPath)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshTree()
      toast.success("资源目录已刷新")
    } catch (error) {
      toast.error("刷新失败", {
        description: error instanceof Error ? error.message : "无法读取目录",
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "n") {
        event.preventDefault()
        void createFile("note.md", notesPath)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "n") {
        event.preventDefault()
        setCreateTarget({ kind: "file", parentPath: notesPath })
        return
      }
      if (key === "f5") {
        event.preventDefault()
        void handleRefresh()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [createFile, notesPath])

  const resolveRenameTarget = (path: string) => {
    const find = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path.replace(/\\/g, "/") === path.replace(/\\/g, "/")) {
          return node
        }
        if (node.children?.length) {
          const found = find(node.children)
          if (found) {
            return found
          }
        }
      }
      return null
    }
    const node = find(tree)
    setRenameTarget({ path, isFolder: node?.type === "folder" })
  }

  return (
    <>
      <SidebarHeader
        className={cn("gap-2 px-2.5 pt-3", collapsed && "items-center px-1.5")}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 px-0.5",
            collapsed && "w-full justify-center px-0"
          )}
          data-tauri-drag-region
        >
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
            onClick={() => navigate("/")}
            aria-label="回到笔记"
          >
            <CaelumLogo className="size-5" />
          </button>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[15px] font-semibold tracking-tight">
              {config?.workspaceName ?? "Caelum"}
            </div>
          </div>
        </div>

        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg text-muted-foreground"
                    aria-label="搜索"
                    onClick={() => setSearchOpen(true)}
                  />
                }
              >
                <Search className="size-4" strokeWidth={1.75} />
              </TooltipTrigger>
              <TooltipContent side="right">搜索笔记</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "size-8 rounded-lg",
                      onBoard ? "bg-primary/12 text-primary" : "text-muted-foreground"
                    )}
                    aria-label="便签板"
                    onClick={() => navigate("/board")}
                  />
                }
              >
                <StickyNote className="size-4" strokeWidth={1.75} />
              </TooltipTrigger>
              <TooltipContent side="right">便签板</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <SidebarInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索笔记 / 文件名"
                className="h-9 rounded-xl border-border/40 bg-background/50 pl-8 text-[13px] transition-colors duration-150 hover:bg-background/70 focus-visible:border-primary/35"
              />
            </div>
            <div className="flex items-center gap-1 px-0.5">
              {(
                [
                  { mode: "name-asc" as const, icon: ArrowDownAZ, label: "名称升序" },
                  { mode: "name-desc" as const, icon: ArrowUpAZ, label: "名称降序" },
                  { mode: "type" as const, icon: FolderTree, label: "按类型排序" },
                ] as const
              ).map((item) => {
                const Icon = item.icon
                const active = sortMode === item.mode
                return (
                  <Tooltip key={item.mode}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label={item.label}
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-lg transition-colors duration-150",
                            active
                              ? "bg-primary/12 text-primary"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          )}
                          onClick={() => setSortMode(item.mode)}
                        />
                      }
                    >
                      <Icon className="size-3.5" strokeWidth={1.75} />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{item.label}</TooltipContent>
                  </Tooltip>
                )
              })}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="刷新"
                      className={cn(
                        "ml-auto inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground",
                        refreshing && "animate-spin text-primary"
                      )}
                      onClick={() => void handleRefresh()}
                    />
                  }
                >
                  <RefreshCw className="size-3.5" strokeWidth={1.75} />
                </TooltipTrigger>
                <TooltipContent side="bottom">刷新目录</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator className="mx-2 w-auto bg-border/40 group-data-[collapsible=icon]:hidden" />

      {collapsed ? null : (
        <div className="px-2.5 pb-1 group-data-[collapsible=icon]:hidden">
          <button
            type="button"
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[12.5px] transition-colors",
              onBoard
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
            onClick={() => navigate("/board")}
          >
            <StickyNote className="size-3.5 shrink-0" strokeWidth={1.75} />
            便签板
            <span className="ml-auto text-[10px] tracking-wide text-muted-foreground/70">
              整理
            </span>
          </button>
        </div>
      )}

      {collapsed ? <div className="min-h-0 flex-1" aria-hidden /> : null}

      <SidebarContent
        className={cn("px-0", collapsed && "hidden")}
        {...{ [EXPLORER_ZONE_ATTR]: "explorer" }}
      >
        <SidebarGroup className="min-h-0 flex-1 px-1.5 py-1">
          <SidebarGroupContent className="min-h-0 flex-1">
            {hasNoResults ? (
              <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                未找到匹配「{searchQuery.trim()}」的文件
              </div>
            ) : (
              <FileTree
                data={filteredTree}
                notesPath={notesPath}
                activeFilePath={selectedFilePath}
                onOpen={(path) => {
                  if (location.pathname !== "/") {
                    navigate("/")
                  }
                  void selectFile(path)
                }}
                onRename={(path) => resolveRenameTarget(path)}
                onDelete={(paths) => setDeleteTarget(paths)}
                onCreateFile={(parentPath) => setCreateTarget({ kind: "file", parentPath })}
                onCreateFolder={(parentPath) => setCreateTarget({ kind: "folder", parentPath })}
                onCopyPath={(path) => {
                  void writeTextToClipboard(path)
                    .then(() => toast.success("已复制路径"))
                    .catch((error) => {
                      toast.error("复制失败", {
                        description: error instanceof Error ? error.message : "无法写入剪贴板",
                      })
                    })
                }}
                onCopyWikiLink={(path) => {
                  const name = path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? path
                  void writeTextToClipboard(`[[${name}]]`)
                    .then(() =>
                      toast.success("已复制笔记链接", {
                        description: `粘贴 [[${name}]] 到正文，预览中点击即可跳转到该笔记`,
                      })
                    )
                    .catch((error) => {
                      toast.error("复制失败", {
                        description: error instanceof Error ? error.message : "无法写入剪贴板",
                      })
                    })
                }}
                onReveal={(path) => {
                  void revealItemInDir(path).catch(() => {
                    toast.error("无法在资源管理器中打开")
                  })
                }}
                onDropTabFile={(sourcePath, destinationDir) => {
                  void (async () => {
                    try {
                      const copied = await copyFileToDirectory(sourcePath, destinationDir)
                      if (copied) {
                        toast.success("已复制到资源管理器", {
                          description: copied.split(/[\\/]/).pop(),
                        })
                      }
                    } catch (error) {
                      toast.error("复制失败", {
                        description: error instanceof Error ? error.message : "无法复制文件",
                      })
                    }
                  })()
                }}
                onPasteFiles={async (sourcePaths, destinationDir) => {
                  let lastCopied: string | null = null
                  for (const sourcePath of sourcePaths) {
                    lastCopied = await copyFileToDirectory(sourcePath, destinationDir)
                  }
                  toast.success(
                    sourcePaths.length === 1 ? "已粘贴到资源管理器" : `已粘贴 ${sourcePaths.length} 个文件`,
                    { description: lastCopied?.split(/[\\/]/).pop() }
                  )
                }}
                onRefresh={() => void handleRefresh()}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-2 w-auto bg-border/40 group-data-[collapsible=icon]:hidden" />

      <SidebarFooter
        className={cn(
          "gap-1 px-2 pb-3",
          collapsed && "mt-auto items-center gap-1.5 px-1.5"
        )}
      >
        {collapsed ? (
          <div className="flex w-full flex-col items-center gap-1 rounded-2xl bg-muted/35 p-1 ring-1 ring-border/40">
            <AppearanceMenu compact />
            <div className="h-px w-5 bg-border/50" />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-background/80 hover:text-foreground"
                    aria-label="设置"
                    onClick={() => navigate("/settings")}
                  />
                }
              >
                <SlidersHorizontal className="size-4" strokeWidth={1.75} />
              </TooltipTrigger>
              <TooltipContent side="right">设置</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <AppearanceMenu />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-[13px] text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground active:scale-[0.99]"
              onClick={() => navigate("/settings")}
            >
              <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.75} />
              设置
            </Button>
          </div>
        )}
      </SidebarFooter>

      <InputDialog
        open={createTarget !== null}
        title={createTarget?.kind === "folder" ? "新建文件夹" : "新建文档"}
        description={`将创建到：${parentLabel(createTarget?.parentPath, notesPath)}`}
        defaultValue={createTarget?.kind === "folder" ? "new-folder" : "note"}
        inputPlaceholder={createTarget?.kind === "folder" ? "文件夹名称" : "文件名称"}
        confirmLabel="创建"
        extensionOptions={createTarget?.kind === "file" ? CREATE_EXTENSIONS : undefined}
        defaultExtension="md"
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null)
          }
        }}
        onSubmit={handleCreate}
      />

      <RenameDialog
        open={renameTarget !== null}
        path={renameTarget?.path ?? null}
        isFolder={renameTarget?.isFolder}
        confirmInvalidExtension={config?.settings.confirmInvalidExtension ?? true}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
          }
        }}
        onSubmit={async (value) => {
          if (renameTarget) {
            await renameNode(renameTarget.path, value)
          }
        }}
      />

      <InputDialog
        open={searchOpen}
        title="搜索笔记"
        description="输入文件名关键词进行过滤。"
        defaultValue={searchQuery}
        inputPlaceholder="搜索笔记 / 文件名"
        confirmLabel="应用"
        onOpenChange={(open) => {
          if (!open) {
            setSearchOpen(false)
          }
        }}
        onSubmit={async (value) => {
          setSearchQuery(value)
          setSearchOpen(false)
          if (value.trim()) {
            setSidebarCollapsed(false)
          }
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.length > 1
                ? `确定要删除选中的 ${deleteTarget.length} 个项目吗？此操作无法撤销。`
                : `确定要删除 ${deleteTarget?.[0]?.split(/[\\/]/).pop() ?? ""} 吗？此操作无法撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  void (async () => {
                    for (const path of deleteTarget) {
                      await deleteNode(path)
                    }
                  })()
                }
                setDeleteTarget(null)
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
