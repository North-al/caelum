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
    ...(toggles.codeHighlight
      ? [
          [rehypeHighlight, { plainText: ["mermaid"] }] as [
            typeof rehypeHighlight,
            { plainText: string[] },
          ],
        ]
      : []),
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

/** Styles must travel with the capture root — html2pdf clones the element, not <head>. */
export const buildExportDocumentCss = () => `
  .export-root, .export-root * { box-sizing: border-box; }
  .export-root {
    /*
      Single CJK UI font for Latin + Han + digits.
      Avoid bold (700): html2canvas often faux-bolds Latin with a different face/baseline.
    */
    font-family: "Microsoft YaHei", "微软雅黑", "Microsoft YaHei UI", sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.85;
    color: #1f2937;
    background: #ffffff;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 20px;
    position: relative;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }
  .export-root h1,
  .export-root h2,
  .export-root h3,
  .export-root h4,
  .export-root h5,
  .export-root h6 {
    font-family: "Microsoft YaHei", "微软雅黑", "Microsoft YaHei UI", sans-serif;
    font-weight: 400;
    line-height: 1.45;
    letter-spacing: 0;
    margin: 1.25em 0 0.45em;
    color: #111827;
    page-break-after: avoid;
    break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root h1 { font-size: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.35em; }
  .export-root h2 { font-size: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.25em; }
  .export-root h3 { font-size: 20px; }
  .export-root h4 { font-size: 17px; }
  .export-root h5 { font-size: 16px; }
  .export-root h6 { font-size: 15px; color: #374151; }
  .export-root p {
    margin: 0.85em 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root ul, .export-root ol { margin: 0.85em 0; padding-left: 1.5em; }
  .export-root li {
    margin: 0.25em 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root .katex {
    font-size: 1.05em;
    line-height: 1;
  }
  .export-root .katex-html {
    vertical-align: -0.1em;
  }
  .export-root blockquote {
    margin: 1em 0;
    padding: 0.2em 0 0.2em 1em;
    border-left: 3px solid #60a5fa;
    color: #6b7280;
  }
  .export-root pre {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 14px 16px;
    overflow: auto;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 13px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
  .export-root :not(pre) > code {
    background: #f1f5f9;
    padding: 0.15em 0.4em;
    border-radius: 4px;
  }
  .export-root table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root th, .export-root td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  .export-root th { background: #f8fafc; font-weight: 600; }
  .export-root img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
  .export-root a { color: #2563eb; }
  .export-root input[type="checkbox"] { margin-right: 0.4em; }
  .export-root .mermaid-diagram {
    margin: 1.1em 0;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root .mermaid-diagram img,
  .export-root .mermaid-diagram svg {
    max-width: 100%;
    height: auto;
    display: inline-block;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root .mermaid-error, .export-root .mermaid-source {
    color: #334155;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    white-space: pre-wrap;
  }
  .export-root .katex-display {
    margin: 1em 0;
    overflow-x: auto;
    overflow-y: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .export-root .export-toc {
    margin: 0 0 2em;
    padding: 1em 1.25em;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #f8fafc;
  }
  .export-root .export-toc h2 { margin-top: 0; border: none; font-size: 18px; }
  .export-root .export-toc ol { list-style: none; padding-left: 0; }
  .export-root .export-toc .toc-l2 { padding-left: 1rem; }
  .export-root .export-toc .toc-l3 { padding-left: 2rem; }
  .export-root .export-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
    font-size: 56px;
    font-weight: 700;
    color: rgba(15, 23, 42, 0.14);
    transform: rotate(-28deg);
    user-select: none;
    white-space: nowrap;
  }
  .export-root .export-body { position: relative; z-index: 1; }
`

/** Fragment used by html2pdf (styles travel with the cloned node). */
export const buildExportCaptureHtml = (
  bodyHtml: string,
  options?: {
    includeKatexCss?: boolean
    watermarkText?: string
  }
) => {
  const watermark = options?.watermarkText
    ? `<div class="export-watermark">${escapeHtml(options.watermarkText)}</div>`
    : ""
  const katex =
    options?.includeKatexCss !== false ? `<style data-export-katex>${katexCss}</style>` : ""

  return `<div class="export-root">
  <style data-export-doc>${buildExportDocumentCss()}</style>
  ${katex}
  ${watermark}
  <div class="export-body">${bodyHtml}</div>
</div>`
}

export const buildDocumentHtml = (
  title: string,
  bodyHtml: string,
  options?: {
    includeKatexCss?: boolean
    watermarkText?: string
  }
) => {
  const capture = buildExportCaptureHtml(bodyHtml, options)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#fff;">
  ${capture}
</body>
</html>`
}
