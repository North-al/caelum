import { useEffect, useId, useState } from "react"
import { Download } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"

import {
  ExportMermaidDialog,
  type MermaidExportSettings,
} from "~/components/App/ExportMermaidDialog"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { ensureExtension } from "~/lib/export/types"
import { wrapSvgWithBackground, svgToPngBytes } from "~/lib/export/svg-raster"
import { normalizeMermaidSource, renderMermaidSvg } from "~/lib/mermaid"
import { resolveMermaidTheme } from "~/lib/mermaid-theme"
import { writeBinaryFile, writeTextFile } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
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
  const mermaidTheme = useWorkspaceStore((state) => state.config?.settings.mermaidTheme ?? "auto")
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

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

    const theme = resolveMermaidTheme(mermaidTheme, isDark)

    void renderMermaidSvg(source, {
      theme,
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
  }, [code, reactId, isDark, mermaidTheme])

  const handleExport = async (settings: MermaidExportSettings) => {
    if (exporting) {
      return
    }
    setExporting(true)
    const toastId = toast.loading("正在导出图表…")
    try {
      const theme = resolveMermaidTheme(mermaidTheme, isDark)
      const rendered =
        svg ||
        (await renderMermaidSvg(normalizeMermaidSource(code), {
          theme,
          idPrefix: `export-${reactId}`,
        }))
      if (!rendered) {
        throw new Error("图表内容为空")
      }

      if (settings.format === "svg") {
        const picked = await save({
          title: "导出 Mermaid SVG",
          defaultPath: "mermaid.svg",
          filters: [{ name: "SVG", extensions: ["svg"] }],
        })
        if (!picked) {
          toast.message("已取消导出", { id: toastId })
          return
        }
        const target = ensureExtension(picked, "svg")
        const output =
          settings.background === "transparent"
            ? rendered
            : wrapSvgWithBackground(rendered, {
                background: settings.background,
                padding: settings.padding,
              })
        await writeTextFile(target, output)
        toast.success("已导出 SVG", { id: toastId, description: target.split(/[\\/]/).pop() })
        return
      }

      const picked = await save({
        title: "导出 Mermaid PNG",
        defaultPath: "mermaid.png",
        filters: [{ name: "PNG", extensions: ["png"] }],
      })
      if (!picked) {
        toast.message("已取消导出", { id: toastId })
        return
      }
      const target = ensureExtension(picked, "png")
      const bytes = await svgToPngBytes(rendered, {
        background: settings.background === "transparent" ? "#ffffff" : settings.background,
        padding: settings.padding,
        scale: settings.scale,
      })
      await writeBinaryFile(target, bytes)
      toast.success("已导出 PNG", { id: toastId, description: target.split(/[\\/]/).pop() })
    } catch (err) {
      toast.error("导出失败", {
        id: toastId,
        description: err instanceof Error ? err.message : "无法导出图表",
      })
    } finally {
      setExporting(false)
    }
  }

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
    <>
      <div
        className={cn(
          "mermaid-diagram group relative my-[1.1em] overflow-x-auto rounded-[0.65rem] border border-border/50 bg-background/80 px-3 py-4 text-center",
          pending && "min-h-[4.5rem] animate-pulse bg-muted/30",
          className
        )}
      >
        <div className="absolute right-2 top-2 z-10">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="size-7 rounded-md border border-border/60 bg-background/95 shadow-sm"
                  disabled={pending || !svg || exporting}
                  onClick={() => setDialogOpen(true)}
                  aria-label="导出此图"
                />
              }
            >
              <Download className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="left">导出此图</TooltipContent>
          </Tooltip>
        </div>
        {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      </div>

      <ExportMermaidDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={(settings) => {
          void handleExport(settings)
        }}
      />
    </>
  )
}
