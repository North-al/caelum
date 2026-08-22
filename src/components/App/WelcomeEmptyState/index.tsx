import { FilePlus2, StickyNote } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import { useScratchStore } from "~/store/scratch"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

interface Props {
  className?: string
}

/** Frosted welcome surface when no file tab is open. */
export const WelcomeEmptyState = ({ className }: Props) => {
  const navigate = useNavigate()
  const createFile = useWorkspaceStore((state) => state.createFile)
  const toggleCapture = useScratchStore((state) => state.toggleCapture)

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
            在左侧资源管理器选择文件开始编辑，或先用快捷便签把想法钉下来。
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-9 rounded-full px-4 shadow-sm shadow-primary/15 transition-transform duration-150 active:scale-[0.97]"
              onClick={handleCreate}
            >
              <FilePlus2 className="mr-1.5 size-3.5" strokeWidth={1.75} />
              新建笔记
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3 text-muted-foreground"
              onClick={() => void toggleCapture()}
            >
              <StickyNote className="mr-1.5 size-3.5" strokeWidth={1.75} />
              贴一张便签
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3 text-muted-foreground"
              onClick={() => navigate("/board")}
            >
              打开便签板
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
