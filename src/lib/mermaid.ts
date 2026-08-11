import mermaid from "mermaid"

import { resolveMermaidTheme, type MermaidThemeId } from "~/lib/mermaid-theme"
import type { MermaidThemeSetting } from "~/lib/workspace"

let initialized = false
let theme: MermaidThemeId = "default"

const ensureMermaid = (nextTheme: MermaidThemeId) => {
  if (!initialized || theme !== nextTheme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: nextTheme,
      fontFamily: "inherit",
    })
    initialized = true
    theme = nextTheme
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
  }
): Promise<string> => {
  const trimmed = code.trim()
  if (!trimmed) {
    return ""
  }
  const nextTheme =
    options?.theme ??
    resolveMermaidTheme(options?.themeSetting, options?.isDark)
  ensureMermaid(nextTheme)
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
    if (!shouldRender) {
      map.set(
        code,
        `<pre class="mermaid-source"><code>${escapeHtml(code)}</code></pre>`
      )
      continue
    }
    try {
      const svg = await renderMermaidSvg(code, {
        theme: options?.theme,
        themeSetting: options?.themeSetting,
        isDark: options?.isDark,
        idPrefix: "caelum-export-mermaid",
      })
      map.set(code, svg)
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
  value.replace(/\r\n/g, "\n").replace(/\n$/, "").trim()

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
