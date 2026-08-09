import { FilePlus2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

interface Props {
  className?: string
}

/** Frosted welcome surface when no file tab is open. */
export const WelcomeEmptyState = ({ className }: Props) => {
  const createFile = useWorkspaceStore((state) => state.createFile)

  const handleCreate = () => {
    void createFile("note.md").catch((error) => {
      toast.error("创建失败", {
        description: error instanceof Error ? error.message : "无法创建文件",
      })
    })
  }

  return (
    <div className={cn("welcome-empty relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="welcome-empty-aura" aria-hidden />

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10">
        <h1 className="mb-8 max-w-xl text-center text-[1.75rem] font-semibold tracking-tight text-foreground/90 sm:text-[2rem]">
          今天想写点什么？
        </h1>

        <div className="welcome-glass w-full max-w-[34rem] rounded-[1.35rem] border border-white/50 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] dark:border-white/10 dark:shadow-[0_18px_50px_-28px_rgba(0,0,0,0.65)]">
          <p className="px-0.5 text-[13px] leading-relaxed text-muted-foreground">
            在左侧资源管理器选择文件开始编辑，或点击下方按钮新建一篇 Markdown 笔记。
          </p>

          <div className="mt-4">
            <Button
              size="sm"
              className="h-9 rounded-full px-4 shadow-sm shadow-primary/15 transition-transform duration-150 active:scale-[0.97]"
              onClick={handleCreate}
            >
              <FilePlus2 className="mr-1.5 size-3.5" strokeWidth={1.75} />
              新建笔记
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
