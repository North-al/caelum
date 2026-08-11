import mermaid from "mermaid"

let initialized = false
let theme: "default" | "dark" = "default"

const ensureMermaid = (nextTheme: "default" | "dark") => {
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

const resolveTheme = (explicit?: "default" | "dark"): "default" | "dark" => {
  if (explicit) {
    return explicit
  }
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark"
  }
  return "default"
}

let renderSeq = 0

/** Render a Mermaid diagram source to an SVG string (safe for HTML export / preview). */
export const renderMermaidSvg = async (
  code: string,
  options?: { theme?: "default" | "dark"; idPrefix?: string }
): Promise<string> => {
  const trimmed = code.trim()
  if (!trimmed) {
    return ""
  }
  ensureMermaid(resolveTheme(options?.theme))
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

/** Pre-render all Mermaid blocks for export. Failed diagrams become an error <pre>. */
export const buildMermaidSvgMap = async (
  markdown: string,
  options?: { theme?: "default" | "dark" }
): Promise<Map<string, string>> => {
  const map = new Map<string, string>()
  const blocks = extractMermaidBlocks(markdown)
  for (const code of blocks) {
    try {
      const svg = await renderMermaidSvg(code, {
        theme: options?.theme ?? "default",
        idPrefix: "caelum-export-mermaid",
      })
      map.set(code, svg)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mermaid 渲染失败"
      map.set(
        code,
        `<pre class="mermaid-error">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
      )
    }
  }
  return map
}

export const normalizeMermaidSource = (value: string) => value.replace(/\r\n/g, "\n").replace(/\n$/, "").trim()
