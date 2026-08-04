import { useEffect, useMemo } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import hljs from "highlight.js/lib/core"
import json from "highlight.js/lib/languages/json"
import xml from "highlight.js/lib/languages/xml"
import ini from "highlight.js/lib/languages/ini"

import { getFileExtension, getPreviewKind } from "~/lib/file-types"
import { normalizePath } from "~/lib/workspace"
import { cn } from "~/lib/utils"

hljs.registerLanguage("json", json)
hljs.registerLanguage("xml", xml)
hljs.registerLanguage("ini", ini)

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

const highlightLanguage = (extension: string) => {
  if (extension === "json") return "json"
  if (extension === "xml" || extension === "svg") return "xml"
  if (extension === "ini") return "ini"
  return null
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

  const highlighted = useMemo(() => {
    const language = highlightLanguage(extension)
    if (!language || !display.trim()) {
      return null
    }
    try {
      return hljs.highlight(display, { language }).value
    } catch {
      return null
    }
  }, [display, extension])

  // Prefer live SVG content so edits refresh immediately (asset URL is cached by path).
  const svgObjectUrl = useMemo(() => {
    if (kind !== "svg") {
      return null
    }
    const blob = new Blob([content || "<svg xmlns='http://www.w3.org/2000/svg'/>"], {
      type: "image/svg+xml;charset=utf-8",
    })
    return URL.createObjectURL(blob)
  }, [content, kind])

  useEffect(() => {
    return () => {
      if (svgObjectUrl) {
        URL.revokeObjectURL(svgObjectUrl)
      }
    }
  }, [svgObjectUrl])

  if (kind === "svg") {
    const fallbackSrc = convertFileSrc(normalizePath(path))
    return (
      <div className={cn("code-preview flex h-full min-h-0 flex-col overflow-auto bg-background", className)}>
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <img
            key={svgObjectUrl ?? fallbackSrc}
            src={svgObjectUrl ?? fallbackSrc}
            alt={path.split(/[\\/]/).pop()}
            className="max-h-[min(70vh,640px)] max-w-full rounded-xl border border-border/40 bg-muted/20 object-contain p-4"
          />
        </div>
      <pre className="max-h-[35%] overflow-auto border-t border-border/40 bg-muted/20 px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground/90 dark:bg-[#0d1117] dark:text-[#e6edf3]">
          {highlighted ? (
            <code
              className="hljs"
              style={{ background: "transparent", color: "inherit" }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          ) : (
            content
          )}
        </pre>
      </div>
    )
  }

  return (
    <div className={cn("code-preview h-full min-h-0 overflow-auto bg-background px-6 py-5", className)}>
      <pre className="mx-auto max-w-4xl overflow-auto rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words dark:bg-[#0d1117] dark:text-[#e6edf3]">
        {highlighted ? (
          <code
            className="hljs"
            style={{ background: "transparent", color: "inherit" }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          display || "（空文件）"
        )}
      </pre>
    </div>
  )
}
