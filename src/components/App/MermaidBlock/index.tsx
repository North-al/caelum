import { useEffect, useId, useState } from "react"

import { normalizeMermaidSource, renderMermaidSvg } from "~/lib/mermaid"
import { cn } from "~/lib/utils"

interface Props {
  code: string
  className?: string
}

const useIsDark = () => {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  )

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains("dark"))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return dark
}

/** Client-side Mermaid diagram for Markdown preview. */
export const MermaidBlock = ({ code, className }: Props) => {
  const reactId = useId().replace(/:/g, "")
  const isDark = useIsDark()
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(true)

  useEffect(() => {
    let cancelled = false
    const source = normalizeMermaidSource(code)
    if (!source) {
      setSvg("")
      setError(null)
      setPending(false)
      return
    }

    setPending(true)
    setError(null)

    void renderMermaidSvg(source, {
      theme: isDark ? "dark" : "default",
      idPrefix: `preview-${reactId}`,
    })
      .then((next) => {
        if (cancelled) {
          return
        }
        setSvg(next)
        setPending(false)
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }
        setSvg("")
        setError(err instanceof Error ? err.message : "无法渲染 Mermaid 图")
        setPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [code, reactId, isDark])

  if (error) {
    return (
      <div
        className={cn(
          "my-[1.1em] rounded-[0.65rem] border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive",
          className
        )}
      >
        Mermaid 渲染失败：{error}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "mermaid-diagram my-[1.1em] overflow-x-auto rounded-[0.65rem] border border-border/50 bg-background/80 px-3 py-4 text-center",
        pending && "min-h-[4.5rem] animate-pulse bg-muted/30",
        className
      )}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}
