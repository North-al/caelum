import { FilePlus2, FolderPlus, MoreHorizontal, Search, Settings2, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router"

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import { Separator } from "~/components/ui/separator"
import { useWorkspaceStore } from "~/store/workspace"

import type { FileNode } from "~/components/App/FileTree/types"

type CreateKind = "file" | "folder"

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

export const WorkspaceSidebar = () => {
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
  } = useWorkspaceStore()
  const navigate = useNavigate()

  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filteredTree = useMemo(() => filterTree(tree, searchQuery), [searchQuery, tree])

  const handleCreate = async (name: string) => {
    if (createKind === "file") {
      await createFile(name)
    } else if (createKind === "folder") {
      await createFolder(name)
    }
  }

  const renameDefault = renameTarget ? renameTarget.split("/").pop() ?? "" : ""

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar/80">
      <div className="border-b border-border/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">{config?.workspaceName ?? "Caelum"}</div>
              <div className="text-xs text-muted-foreground">本地工作区</div>
            </div>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={() => navigate("/settings")}>
            <Settings2 className="size-4" />
          </Button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="default" size="sm" className="flex-1 justify-center">
                  <FilePlus2 className="mr-1 size-4" />
                  新建
                  <MoreHorizontal className="ml-1 size-4" />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCreateKind("file")}>新建 Markdown 文件</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateKind("folder")}>新建文件夹</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索笔记..." className="pl-8" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/50 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          文件
        </div>
        <div className="min-h-0 flex-1">
          <FileTree
            data={filteredTree}
            selectedPath={selectedFilePath}
            onSelect={(path) => void selectFile(path)}
            onRename={(path) => setRenameTarget(path)}
            onDelete={(path) => setDeleteTarget(path)}
          />
        </div>
        <Separator />
        <div className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">最近打开</div>
          <div className="mt-2 space-y-1">
            {(config?.recentFiles ?? []).map((item) => (
              <button
                key={item}
                type="button"
                className="flex w-full items-center truncate rounded-md px-2 py-1 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => void selectFile(item)}
              >
                {item.split("/").pop()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <InputDialog
        open={createKind !== null}
        title={createKind === "folder" ? "新建文件夹" : "新建 Markdown 文件"}
        description="输入名称后会创建到默认工作区目录。"
        defaultValue={createKind === "folder" ? "new-folder" : "note.md"}
        inputPlaceholder={createKind === "folder" ? "文件夹名称" : "文件名称"}
        confirmLabel="创建"
        onOpenChange={(open) => {
          if (!open) {
            setCreateKind(null)
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 {deleteTarget ? deleteTarget.split("/").pop() : ""} 吗？此操作无法撤销。
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
                  void deleteNode(deleteTarget)
                }
                setDeleteTarget(null)
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
