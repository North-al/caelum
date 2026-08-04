import { FilePlus2, FolderPlus, Search, Settings2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"

import { AppearanceMenu } from "~/components/App/AppearanceMenu"
import { CaelumLogo } from "~/components/App/CaelumLogo"
import { FileTree } from "~/components/App/FileTree"
import { InputDialog } from "~/components/App/InputDialog"
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
  SidebarGroupLabel,
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
import { useWorkspaceStore } from "~/store/workspace"
import { EXPLORER_ZONE_ATTR } from "~/lib/dnd"

import type { FileNode } from "~/components/App/FileTree/types"

type CreateKind = "file" | "folder"

interface CreateTarget {
  kind: CreateKind
  parentPath?: string
}

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

const parentLabel = (parentPath?: string, notesPath?: string) => {
  if (!parentPath || parentPath === notesPath) {
    return "工作区根目录"
  }
  return parentPath.split(/[\\/]/).pop() ?? parentPath
}

export const WorkspaceSidebar = () => {
  const navigate = useNavigate()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

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
  } = useWorkspaceStore()

  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const filteredTree = useMemo(() => filterTree(tree, searchQuery), [searchQuery, tree])
  const notesPath = config?.notesPath

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

  const renameDefault = renameTarget ? renameTarget.split(/[\\/]/).pop() ?? "" : ""

  return (
    <>
      <SidebarHeader className="gap-2.5 pt-3">
        <div className="flex items-center gap-2.5 px-1" data-tauri-drag-region>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <CaelumLogo className="size-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[15px] font-semibold tracking-tight">{config?.workspaceName ?? "Caelum"}</div>
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
                <Search className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">搜索笔记</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索笔记..."
              className="h-9 rounded-xl border-border/50 bg-background/60 pl-8 text-[13px]"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />

      <SidebarContent
        className="px-0 group-data-[collapsible=icon]:hidden"
        {...{ [EXPLORER_ZONE_ATTR]: "explorer" }}
      >
        <SidebarGroup className="min-h-0 flex-1 px-1 py-1">
          <SidebarGroupLabel className="h-6 px-2 text-[11px] font-medium tracking-wide text-muted-foreground/70">
            资源管理器
          </SidebarGroupLabel>
          <SidebarGroupContent className="min-h-0 flex-1">
            <FileTree
              data={filteredTree}
              notesPath={notesPath}
              activeFilePath={selectedFilePath}
              onOpen={(path) => void selectFile(path)}
              onRename={(path) => setRenameTarget(path)}
              onDelete={(paths) => setDeleteTarget(paths)}
              onCreateFile={(parentPath) => setCreateTarget({ kind: "file", parentPath })}
              onCreateFolder={(parentPath) => setCreateTarget({ kind: "folder", parentPath })}
              onCopyPath={(path) => {
                void navigator.clipboard.writeText(path)
                toast.success("已复制路径")
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
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />

      <SidebarFooter className="gap-1 pb-3 group-data-[collapsible=icon]:items-center">
        {collapsed ? (
          <>
            <AppearanceMenu compact />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 text-muted-foreground"
                    aria-label="设置"
                    onClick={() => navigate("/settings")}
                  />
                }
              >
                <Settings2 className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">设置</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <AppearanceMenu />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-[13px] text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={() => navigate("/settings")}
            >
              <Settings2 className="size-4 shrink-0" />
              设置
            </Button>
          </>
        )}
      </SidebarFooter>

      <InputDialog
        open={createTarget !== null}
        title={createTarget?.kind === "folder" ? "新建文件夹" : "新建 Markdown 文件"}
        description={`将创建到：${parentLabel(createTarget?.parentPath, notesPath)}`}
        defaultValue={createTarget?.kind === "folder" ? "new-folder" : "note.md"}
        inputPlaceholder={createTarget?.kind === "folder" ? "文件夹名称" : "文件名称"}
        confirmLabel="创建"
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null)
          }
        }}
        onSubmit={handleCreate}
      />

      <InputDialog
        open={renameTarget !== null}
        title="重命名"
        description="请输入新的文件或文件夹名称。"
        defaultValue={renameDefault}
        inputPlaceholder="新的名称"
        confirmLabel="保存"
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
          }
        }}
        onSubmit={async (value) => {
          if (renameTarget) {
            await renameNode(renameTarget, value)
          }
        }}
      />

      <InputDialog
        open={searchOpen}
        title="搜索笔记"
        description="输入文件名关键词进行过滤。"
        defaultValue={searchQuery}
        inputPlaceholder="搜索..."
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
