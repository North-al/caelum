import { useEffect, useMemo, useRef } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import hljs from "highlight.js/lib/core"
import bash from "highlight.js/lib/languages/bash"
import c from "highlight.js/lib/languages/c"
import cpp from "highlight.js/lib/languages/cpp"
import csharp from "highlight.js/lib/languages/csharp"
import css from "highlight.js/lib/languages/css"
import dockerfile from "highlight.js/lib/languages/dockerfile"
import dos from "highlight.js/lib/languages/dos"
import go from "highlight.js/lib/languages/go"
import graphql from "highlight.js/lib/languages/graphql"
import ini from "highlight.js/lib/languages/ini"
import java from "highlight.js/lib/languages/java"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import kotlin from "highlight.js/lib/languages/kotlin"
import less from "highlight.js/lib/languages/less"
import makefile from "highlight.js/lib/languages/makefile"
import markdown from "highlight.js/lib/languages/markdown"
import plaintext from "highlight.js/lib/languages/plaintext"
import powershell from "highlight.js/lib/languages/powershell"
import python from "highlight.js/lib/languages/python"
import rust from "highlight.js/lib/languages/rust"
import scss from "highlight.js/lib/languages/scss"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"

import { PreviewEmptyHint } from "~/components/App/EditorEmptyGuide"
import { WikiAwareText } from "~/components/App/WikiAwareText"
import { tryFormatByExtension } from "~/lib/format-code"
import { getFileExtension, getHighlightLanguage, getPreviewKind } from "~/lib/file-types"
import { normalizePath } from "~/lib/workspace"
import { cn } from "~/lib/utils"

hljs.registerLanguage("bash", bash)
hljs.registerLanguage("c", c)
hljs.registerLanguage("cpp", cpp)
hljs.registerLanguage("csharp", csharp)
hljs.registerLanguage("css", css)
hljs.registerLanguage("dockerfile", dockerfile)
hljs.registerLanguage("dos", dos)
hljs.registerLanguage("go", go)
hljs.registerLanguage("graphql", graphql)
hljs.registerLanguage("ini", ini)
hljs.registerLanguage("java", java)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("json", json)
hljs.registerLanguage("kotlin", kotlin)
hljs.registerLanguage("less", less)
hljs.registerLanguage("makefile", makefile)
hljs.registerLanguage("markdown", markdown)
hljs.registerLanguage("plaintext", plaintext)
hljs.registerLanguage("powershell", powershell)
hljs.registerLanguage("python", python)
hljs.registerLanguage("rust", rust)
hljs.registerLanguage("scss", scss)
hljs.registerLanguage("sql", sql)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("xml", xml)
hljs.registerLanguage("yaml", yaml)
// protobuf is optional in some hljs builds — map to plaintext fallback via getHighlightLanguage

interface Props {
  path: string
  content: string
  className?: string
  containerRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (scrollTop: number) => void
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
    const language = getHighlightLanguage(path)
    if (!language || language === "plaintext" || !display.trim()) {
      return null
    }
    try {
      if (!hljs.getLanguage(language)) {
        return null
      }
      return hljs.highlight(display, { language }).value
    } catch {
      return null
    }
  }, [display, path])

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
      ) : highlighted ? (
        <pre className="mx-auto max-w-4xl overflow-auto font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words dark:text-[#d7dae3]">
          <code
            className="hljs"
            style={{ background: "transparent", color: "inherit" }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      ) : (
        <div className="mx-auto max-w-4xl font-mono text-[13px] leading-relaxed text-foreground dark:text-[#d7dae3]">
          <WikiAwareText text={display} />
        </div>
      )}
    </div>
  )
}
