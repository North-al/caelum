import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"
import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown, { type Components } from "react-markdown"
import katexCss from "katex/dist/katex.min.css?raw"

import { getFencedCodeMeta } from "~/lib/code-fence"
import { resolveMarkdownAssetUrl } from "~/lib/markdown"
import { buildMermaidSvgMap, normalizeMermaidSource } from "~/lib/mermaid"
import { normalizeTaskListSyntax } from "~/lib/task-list"
import type { MermaidThemeSetting } from "~/lib/workspace"
import {
  defaultRenderToggles,
  escapeHtml,
  type RenderToggles,
} from "~/lib/export/types"

const extractText = (children: ReactNode): string => {
  if (typeof children === "string") return children
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props?: { children?: ReactNode } }).props?.children)
  }
  return ""
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")

const stripMathForExport = (markdown: string) =>
  markdown
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, body: string) => `\n\`\`\`\n${body.trim()}\n\`\`\`\n`)
    .replace(/\$([^$\n]+)\$/g, "`$1`")

export interface RenderHtmlOptions {
  filePath: string
  workspaceRoot: string
  render?: Partial<RenderToggles>
  mermaidTheme?: MermaidThemeSetting
  tableOfContents?: boolean
}

export const renderMarkdownToHtml = async (markdown: string, options: RenderHtmlOptions) => {
  const toggles: RenderToggles = { ...defaultRenderToggles, ...options.render }
  let source = normalizeTaskListSyntax(markdown)
  if (!toggles.math) {
    source = stripMathForExport(source)
  }

  const mermaidMap = await buildMermaidSvgMap(source, {
    themeSetting: options.mermaidTheme ?? "auto",
    render: toggles.mermaid,
  })

  const remarkPlugins = toggles.math ? [remarkGfm, remarkMath] : [remarkGfm]
  const rehypePlugins = [
    ...(toggles.math ? [rehypeKatex] : []),
    ...(toggles.codeHighlight ? [rehypeHighlight] : []),
  ]

  const components: Components = {
    h1: ({ children }) => createElement("h1", { id: slugify(extractText(children)) }, children),
    h2: ({ children }) => createElement("h2", { id: slugify(extractText(children)) }, children),
    h3: ({ children }) => createElement("h3", { id: slugify(extractText(children)) }, children),
    h4: ({ children }) => createElement("h4", { id: slugify(extractText(children)) }, children),
    h5: ({ children }) => createElement("h5", { id: slugify(extractText(children)) }, children),
    h6: ({ children }) => createElement("h6", { id: slugify(extractText(children)) }, children),
    img: ({ src, alt, ...props }) => {
      const resolved =
        typeof src === "string"
          ? resolveMarkdownAssetUrl(src, options.filePath, options.workspaceRoot)
          : src
      if (!resolved || typeof resolved !== "string") {
        return null
      }
      return createElement("img", { ...props, src: resolved, alt: alt ?? "" })
    },
    a: ({ href, children, ...props }) =>
      createElement(
        "a",
        { ...props, href: typeof href === "string" ? href : "", target: "_blank", rel: "noreferrer" },
        children
      ),
    input: ({ type, checked, disabled, ...props }) => {
      if (type === "checkbox") {
        return createElement("input", {
          ...props,
          type: "checkbox",
          checked: Boolean(checked),
          disabled: disabled ?? true,
          readOnly: true,
        })
      }
      return createElement("input", { type, checked, disabled, ...props })
    },
    pre: ({ children }) => {
      const meta = getFencedCodeMeta(children)
      if (meta.language === "mermaid") {
        const key = normalizeMermaidSource(meta.text)
        const svg = mermaidMap.get(key)
        if (svg) {
          return createElement("div", {
            className: "mermaid-diagram",
            dangerouslySetInnerHTML: { __html: svg },
          })
        }
        return createElement(
          "pre",
          { className: "mermaid-error" },
          createElement("code", null, meta.text)
        )
      }
      return createElement("pre", null, children)
    },
  }

  let bodyHtml = renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins,
      rehypePlugins,
      components,
      children: source,
    })
  )

  if (options.tableOfContents) {
    bodyHtml = `${buildTocHtml(bodyHtml)}${bodyHtml}`
  }

  return bodyHtml
}

const buildTocHtml = (bodyHtml: string) => {
  const headings: Array<{ id: string; text: string; level: number }> = []
  const pattern = /<h([1-3])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(bodyHtml)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, "").trim()
    if (!text) continue
    headings.push({ level: Number(match[1]), id: match[2], text })
  }
  if (headings.length === 0) {
    return ""
  }
  const items = headings
    .map(
      (item) =>
        `<li class="toc-l${item.level}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`
    )
    .join("")
  return `<nav class="export-toc"><h2>目录</h2><ol>${items}</ol></nav>`
}

export const buildDocumentHtml = (
  title: string,
  bodyHtml: string,
  options?: {
    includeKatexCss?: boolean
    watermarkText?: string
  }
) => {
  const watermark = options?.watermarkText
    ? `<div class="export-watermark">${escapeHtml(options.watermarkText)}</div>`
    : ""

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      line-height: 1.75;
      color: #1f2937;
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 32px;
      position: relative;
    }
    h1,h2,h3,h4,h5,h6 { line-height: 1.3; letter-spacing: -0.02em; margin: 1.4em 0 0.5em; }
    h1 { font-size: 1.875rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.35em; }
    h2 { font-size: 1.4rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.25em; }
    p { margin: 0.85em 0; }
    ul, ol { margin: 0.85em 0; padding-left: 1.5em; }
    li { margin: 0.25em 0; }
    blockquote {
      margin: 1em 0;
      padding: 0.2em 0 0.2em 1em;
      border-left: 3px solid #60a5fa;
      color: #6b7280;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px 16px;
      overflow: auto;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.875em;
    }
    code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
    :not(pre) > code {
      background: #f1f5f9;
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    a { color: #2563eb; }
    input[type="checkbox"] { margin-right: 0.4em; }
    .mermaid-diagram { margin: 1.1em 0; overflow-x: auto; text-align: center; }
    .mermaid-diagram svg { max-width: 100%; height: auto; }
    .mermaid-error, .mermaid-source {
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      white-space: pre-wrap;
    }
    .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
    .export-toc { margin: 0 0 2em; padding: 1em 1.25em; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; }
    .export-toc h2 { margin-top: 0; border: none; font-size: 1.1rem; }
    .export-toc ol { list-style: none; padding-left: 0; }
    .export-toc .toc-l2 { padding-left: 1rem; }
    .export-toc .toc-l3 { padding-left: 2rem; }
    .export-watermark {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
      font-size: 64px;
      font-weight: 700;
      color: rgba(15, 23, 42, 0.06);
      transform: rotate(-28deg);
      user-select: none;
    }
    .export-body { position: relative; z-index: 1; }
    @media print {
      body { padding: 0; max-width: none; }
    }
  </style>
  ${options?.includeKatexCss !== false ? `<style>${katexCss}</style>` : ""}
</head>
<body>
  ${watermark}
  <div class="export-body">${bodyHtml}</div>
</body>
</html>`
}
