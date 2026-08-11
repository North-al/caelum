import mermaid from "mermaid"

import { resolveMermaidTheme, type MermaidThemeId } from "~/lib/mermaid-theme"
import type { MermaidThemeSetting } from "~/lib/workspace"

let initialized = false
let theme: MermaidThemeId = "default"
/** Preview uses HTML labels; export rasterization needs SVG text (no foreignObject). */
let htmlLabels = true
/** Bump when initialize() options change so HMR / long sessions pick them up. */
const MERMAID_INIT_VERSION = 4
let initVersion = 0

const EXPORT_FONT =
  '"Microsoft YaHei UI","Microsoft YaHei","微软雅黑","PingFang SC",sans-serif'

const ensureMermaid = (nextTheme: MermaidThemeId, nextHtmlLabels: boolean) => {
  if (
    !initialized ||
    theme !== nextTheme ||
    htmlLabels !== nextHtmlLabels ||
    initVersion !== MERMAID_INIT_VERSION
  ) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: nextTheme,
      fontFamily: EXPORT_FONT,
      // Mermaid 11: root htmlLabels wins. Export PNG needs false (no foreignObject).
      htmlLabels: nextHtmlLabels,
      flowchart: { htmlLabels: nextHtmlLabels },
      sequence: { useMaxWidth: true },
    })
    initialized = true
    theme = nextTheme
    htmlLabels = nextHtmlLabels
    initVersion = MERMAID_INIT_VERSION
  }
}

let renderSeq = 0

/** Render a Mermaid diagram source to an SVG string (safe for HTML export / preview). */
export const renderMermaidSvg = async (
  code: string,
  options?: {
    theme?: MermaidThemeId
    themeSetting?: MermaidThemeSetting
    isDark?: boolean
    idPrefix?: string
    /**
     * When true, force SVG text labels (no foreignObject) for reliable PNG rasterization.
     * Preview should keep the default (HTML labels).
     */
    forExport?: boolean
  }
): Promise<string> => {
  const trimmed = code.trim()
  if (!trimmed) {
    return ""
  }
  const nextTheme =
    options?.theme ??
    resolveMermaidTheme(options?.themeSetting, options?.isDark)
  ensureMermaid(nextTheme, options?.forExport ? false : true)
  const id = `${options?.idPrefix ?? "caelum-mermaid"}-${++renderSeq}`
  const { svg } = await mermaid.render(id, trimmed)
  return svg
}

/** Collect unique ```mermaid fenced blocks from markdown source. */
export const extractMermaidBlocks = (markdown: string): string[] => {
  const blocks: string[] = []
  const seen = new Set<string>()
  const pattern = /```mermaid\s*\n([\s\S]*?)```/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(markdown)) !== null) {
    const code = match[1].replace(/\n$/, "").trim()
    if (!code || seen.has(code)) {
      continue
    }
    seen.add(code)
    blocks.push(code)
  }
  return blocks
}

export const hasMermaidBlocks = (markdown: string) => extractMermaidBlocks(markdown).length > 0

/** Pre-render all Mermaid blocks for export. Failed diagrams become an error <pre>. */
export const buildMermaidSvgMap = async (
  markdown: string,
  options?: {
    theme?: MermaidThemeId
    themeSetting?: MermaidThemeSetting
    isDark?: boolean
    /** When false, leave mermaid as source code blocks instead of rendering. */
    render?: boolean
  }
): Promise<Map<string, string>> => {
  const map = new Map<string, string>()
  const blocks = extractMermaidBlocks(markdown)
  const shouldRender = options?.render !== false

  for (const code of blocks) {
    const normalized = normalizeMermaidSource(code)
    if (!shouldRender) {
      map.set(
        code,
        `<pre class="mermaid-source"><code>${escapeHtml(normalized)}</code></pre>`
      )
      continue
    }
    try {
      const svg = await renderMermaidSvg(normalized, {
        theme: options?.theme,
        themeSetting: options?.themeSetting,
        isDark: options?.isDark,
        idPrefix: "caelum-export-mermaid",
        forExport: true,
      })
      map.set(code, svg)
      if (normalized !== code) {
        map.set(normalized, svg)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mermaid 渲染失败"
      map.set(
        code,
        `<pre class="mermaid-error">${escapeHtml(`${message}\n\n${code}`)}</pre>`
      )
    }
  }
  return map
}

export const normalizeMermaidSource = (value: string) =>
  repairMermaidSource(value.replace(/\r\n/g, "\n").replace(/\n$/, "").trim())

/**
 * Soft-repair common Mermaid authoring pitfalls so preview is more forgiving.
 * - Blank lines right after the diagram keyword (mindmap quirk → "mindmaproot")
 * - Flowchart edges split across lines (--> / |label| / target on their own lines)
 */
export const repairMermaidSource = (source: string) => {
  if (!source) {
    return source
  }

  let text = source

  // Drop blank lines immediately after the diagram type line.
  text = text.replace(
    /^((?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|sankey-beta|xychart-beta|block-beta|kanban)\b[^\n]*)(?:\n[ \t]*)+\n/i,
    "$1\n"
  )

  if (/^(flowchart|graph)\b/im.test(text)) {
    text = repairFlowchartBrokenEdges(text)
  }

  return text
}

const EDGE_OP = "(?:<{0,2}(?:--|==|~~|\\.\\.)>{0,2}|-->|---|==>|-.->|~~~|==)"

/** Collapse "node \\n --> \\n |label| \\n target" into a single statement. */
const repairFlowchartBrokenEdges = (source: string) => {
  let text = source
  let previous = ""
  // Repeat until stable — chains like A\\n-->\\nB\\n-->\\nC need multiple passes.
  while (text !== previous) {
    previous = text
    // node \n --> \n |label| \n target
    text = text.replace(
      new RegExp(
        `([^\\n]+?)\\n[ \\t]*(${EDGE_OP})[ \\t]*\\n[ \\t]*(\\|[^\\n|]*\\|)[ \\t]*\\n[ \\t]*([^\\n]+)`,
        "g"
      ),
      "$1 $2$3 $4"
    )
    // node \n --> \n target
    text = text.replace(
      new RegExp(`([^\\n]+?)\\n[ \\t]*(${EDGE_OP})[ \\t]*\\n[ \\t]*([^|\\n][^\\n]*)`, "g"),
      "$1 $2 $3"
    )
  }
  return text
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
