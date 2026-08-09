import { Link2 } from "lucide-react"
import { toast } from "sonner"

import { resolveWikiStem } from "~/lib/wiki"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

const WIKI_SPLIT = /(\[\[[^\]|#]+(?:\|[^\]]+)?(?:#[^\]]+)?\]\])/g
const WIKI_PARSE = /^\[\[([^\]|#]+)(?:\|([^\]]+))?(?:#([^\]]+))?\]\]$/

interface WikiAwareTextProps {
  text: string
  className?: string
}

/** Render plain text with clickable `[[note]]` wiki links. */
export const WikiAwareText = ({ text, className }: WikiAwareTextProps) => {
  const tree = useWorkspaceStore((state) => state.tree)
  const selectFile = useWorkspaceStore((state) => state.selectFile)

  const openWiki = (stem: string) => {
    const target = resolveWikiStem(tree, stem)
    if (!target) {
      toast.error("未找到对应笔记", {
        description: `没有名为「${stem}」的文件。可先在侧栏新建，或检查双链名称是否一致。`,
      })
      return
    }
    void selectFile(target)
  }

  const parts = text.split(WIKI_SPLIT)

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) => {
        const match = part.match(WIKI_PARSE)
        if (!match) {
          return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>
        }
        const stem = match[1]?.trim() ?? ""
        const alias = match[2]?.trim()
        const label = alias || stem
        const exists = Boolean(resolveWikiStem(tree, stem))
        return (
          <button
            key={`${index}-${stem}`}
            type="button"
            title={exists ? `打开笔记：${stem}` : `未找到笔记：${stem}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[0.95em] font-medium underline-offset-2 transition-colors",
              exists
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:underline"
                : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
            )}
            onClick={() => openWiki(stem)}
          >
            <Link2 className="size-3 shrink-0 opacity-80" strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </span>
  )
}
