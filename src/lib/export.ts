import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"

import { resolveMarkdownAssetUrl } from "~/lib/markdown"
import { normalizeTaskListSyntax } from "~/lib/task-list"
import { getParentPath, writeTextFile } from "~/lib/workspace"

/** `md` = 解析 Markdown 后导出为 HTML；`source` = 原始 Markdown 源码 */
export type ExportFormat = "md" | "source" | "txt" | "html" | "pdf"

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const fileStem = (path: string) => {
  const name = path.split(/[\\/]/).pop() ?? "note"
  return name.replace(/\.[^.]+$/, "") || "note"
}

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

/** Full GFM markdown → HTML body (same pipeline as preview). */
export const renderMarkdownToHtml = (
  markdown: string,
  options: {
    filePath: string
    workspaceRoot: string
    codeHighlight?: boolean
  }
) => {
  const normalized = normalizeTaskListSyntax(markdown)
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
  }

  return renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: options.codeHighlight === false ? [] : [rehypeHighlight],
      components,
      children: normalized,
    })
  )
}

const buildDocumentHtml = (title: string, bodyHtml: string) => `<!DOCTYPE html>
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
    @media print {
      body { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`

const ensureExtension = (path: string, extension: string) => {
  const normalized = path.replace(/\\/g, "/")
  if (normalized.toLowerCase().endsWith(`.${extension}`)) {
    return path
  }
  return `${path}.${extension}`
}

const buildRenderedBody = (options: {
  content: string
  sourcePath: string
  workspaceRoot?: string
  codeHighlight?: boolean
  previewHtml?: string
}) => {
  if (options.previewHtml?.trim()) {
    return options.previewHtml
  }
  const workspaceRoot = options.workspaceRoot || getParentPath(options.sourcePath)
  return renderMarkdownToHtml(options.content, {
    filePath: options.sourcePath,
    workspaceRoot,
    codeHighlight: options.codeHighlight,
  })
}

export const exportNote = async (options: {
  format: ExportFormat
  sourcePath: string
  content: string
  workspaceRoot?: string
  codeHighlight?: boolean
  previewHtml?: string
}) => {
  const stem = fileStem(options.sourcePath)
  const title = stem

  if (options.format === "pdf") {
    const bodyHtml = buildRenderedBody(options)
    await printHtmlDocument(buildDocumentHtml(title, bodyHtml))
    toast.message("已打开打印对话框", {
      description: "请选择「Microsoft Print to PDF」或其他 PDF 打印机完成导出",
    })
    return
  }

  // 解析后的 Markdown → HTML 文档
  if (options.format === "md" || options.format === "html") {
    const picked = await save({
      title: "导出为 HTML（Markdown 解析后）",
      defaultPath: `${stem}.html`,
      filters: [{ name: "HTML", extensions: ["html"] }],
    })
    if (!picked) {
      return
    }
    const target = ensureExtension(picked, "html")
    const bodyHtml = buildRenderedBody(options)
    await writeTextFile(target, buildDocumentHtml(title, bodyHtml))
    toast.success("导出成功", {
      description: target.split(/[\\/]/).pop(),
    })
    return
  }

  if (options.format === "source") {
    const picked = await save({
      title: "导出 Markdown 源码",
      defaultPath: `${stem}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    })
    if (!picked) {
      return
    }
    const target = ensureExtension(picked, "md")
    await writeTextFile(target, options.content)
    toast.success("导出成功", {
      description: target.split(/[\\/]/).pop(),
    })
    return
  }

  const picked = await save({
    title: "导出为 TXT",
    defaultPath: `${stem}.txt`,
    filters: [{ name: "Text", extensions: ["txt"] }],
  })
  if (!picked) {
    return
  }
  const target = ensureExtension(picked, "txt")
  await writeTextFile(target, options.content)
  toast.success("导出成功", {
    description: target.split(/[\\/]/).pop(),
  })
}

const printHtmlDocument = async (html: string) => {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  iframe.style.opacity = "0"
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  const frameDocument = iframe.contentDocument
  if (!frameWindow || !frameDocument) {
    document.body.removeChild(iframe)
    throw new Error("无法创建打印预览")
  }

  frameDocument.open()
  frameDocument.write(html)
  frameDocument.close()

  await new Promise<void>((resolve) => {
    const done = () => resolve()
    if (frameDocument.readyState === "complete") {
      window.setTimeout(done, 80)
    } else {
      iframe.addEventListener("load", () => window.setTimeout(done, 80), { once: true })
    }
  })

  frameWindow.focus()
  frameWindow.print()

  window.setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }, 1500)
}
