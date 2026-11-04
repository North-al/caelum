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

/** Quiet empty canvas, in the same register as a new Codex / DeepSeek thread. */
export const WelcomeEmptyState = ({ className }: Props) => {
  const navigate = useNavigate()
  const createFile = useWorkspaceStore((state) => state.createFile)
  const workspaceName = useWorkspaceStore((state) => state.config?.workspaceName)
  const toggleCapture = useScratchStore((state) => state.toggleCapture)

  const handleCreate = () => {
    void createFile("note.md").catch((error) => {
      toast.error("创建失败", {
        description: error instanceof Error ? error.message : "无法创建文件",
      })
    })
  }

  return (
    <div className={cn("welcome-empty relative flex min-h-0 flex-1 flex-col bg-background", className)}>
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16">
        <p className="mb-3 text-[13px] text-muted-foreground">{workspaceName ?? "Caelum"}</p>
        <h1 className="text-center text-[1.75rem] font-semibold tracking-tight text-foreground">
          今天写点什么
        </h1>
        <p className="mt-2 max-w-md text-center text-[13.5px] leading-relaxed text-muted-foreground">
          从左侧打开一篇笔记，或新建一篇开始。想法还没成形时，可以先贴一张便签。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button className="h-9 rounded-lg px-4" onClick={handleCreate}>
            <FilePlus2 className="mr-1.5 size-3.5" strokeWidth={1.75} />
            新建笔记
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-lg px-3.5"
            onClick={() => void toggleCapture()}
          >
            <StickyNote className="mr-1.5 size-3.5" strokeWidth={1.75} />
            贴一张便签
          </Button>
          <Button
            variant="ghost"
            className="h-9 rounded-lg px-3 text-muted-foreground"
            onClick={() => navigate("/board")}
          >
            打开便签板
          </Button>
        </div>
      </div>
    </div>
  )
}
