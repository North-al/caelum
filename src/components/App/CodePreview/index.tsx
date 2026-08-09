import { useEffect, useMemo, useRef } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import hljs from "highlight.js/lib/core"
import json from "highlight.js/lib/languages/json"
import xml from "highlight.js/lib/languages/xml"
import ini from "highlight.js/lib/languages/ini"

import { PreviewEmptyHint } from "~/components/App/EditorEmptyGuide"
import { tryFormatByExtension } from "~/lib/format-code"
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
  containerRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (scrollTop: number) => void
}

const highlightLanguage = (extension: string) => {
  if (extension === "json") return "json"
  if (extension === "xml" || extension === "svg") return "xml"
  if (extension === "ini") return "ini"
  return null
}

export const CodePreview = ({ path, content, className, containerRef, onScroll }: Props) => {
  const kind = getPreviewKind(path)
  const extension = getFileExtension(path)
  const internalRef = useRef<HTMLDivElement | null>(null)

  const setRefs = (node: HTMLDivElement | null) => {
    internalRef.current = node
    if (containerRef) {
      containerRef.current = node
    }
  }

  const display = useMemo(() => {
    if (!content.trim()) {
      return ""
    }
    const formatted = tryFormatByExtension(extension, content)
    return formatted ?? content
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
      <div
        ref={setRefs}
        className={cn("code-preview relative flex h-full min-h-0 flex-col overflow-auto bg-background", className)}
        onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <img
            key={svgObjectUrl ?? fallbackSrc}
            src={svgObjectUrl ?? fallbackSrc}
            alt={path.split(/[\\/]/).pop()}
            className="max-h-[min(70vh,640px)] max-w-full rounded-xl border border-border/40 bg-muted/20 object-contain p-4"
          />
        </div>
        <pre className="max-h-[35%] overflow-auto border-t border-border/40 bg-muted/20 px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground/90 dark:bg-[#12141a] dark:text-[#d7dae3]">
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
    <div
      ref={setRefs}
      className={cn("code-preview h-full min-h-0 overflow-auto bg-background px-6 py-5", className)}
      onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
    >
      {!display.trim() ? (
        <PreviewEmptyHint />
      ) : (
        <pre className="mx-auto max-w-4xl overflow-auto rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words dark:bg-[#12141a] dark:text-[#d7dae3]">
          {highlighted ? (
            <code
              className="hljs"
              style={{ background: "transparent", color: "inherit" }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          ) : (
            display
          )}
        </pre>
      )}
    </div>
  )
}
