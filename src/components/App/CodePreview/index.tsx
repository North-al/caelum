import { useMemo } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"

import { getFileExtension, getPreviewKind } from "~/lib/file-types"
import { normalizePath } from "~/lib/workspace"
import { cn } from "~/lib/utils"

interface Props {
  path: string
  content: string
  className?: string
}

const formatJson = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

export const CodePreview = ({ path, content, className }: Props) => {
  const kind = getPreviewKind(path)
  const extension = getFileExtension(path)

  const display = useMemo(() => {
    if (extension === "json") {
      return formatJson(content)
    }
    return content
  }, [content, extension])

  if (kind === "svg") {
    const src = convertFileSrc(normalizePath(path))
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-auto bg-background", className)}>
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <img
            src={src}
            alt={path.split(/[\\/]/).pop()}
            className="max-h-[min(70vh,640px)] max-w-full rounded-xl border border-border/40 bg-muted/20 object-contain p-4"
          />
        </div>
        <pre className="max-h-[35%] overflow-auto border-t border-border/40 bg-muted/20 px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground/90">
          {content}
        </pre>
      </div>
    )
  }

  return (
    <div className={cn("h-full min-h-0 overflow-auto bg-background px-6 py-5", className)}>
      <pre className="mx-auto max-w-4xl overflow-auto rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {display || "（空文件）"}
      </pre>
    </div>
  )
}
