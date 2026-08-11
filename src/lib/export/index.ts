import { save } from "@tauri-apps/plugin-dialog"

import { buildDocumentHtml, renderMarkdownToHtml } from "~/lib/export/html"
import { exportDocxDocument } from "~/lib/export/docx"
import { markdownToPlainText, normalizeMarkdownSource } from "~/lib/export/normalize"
import { exportPdfDocument } from "~/lib/export/pdf"
import {
  ensureExtension,
  fileStem,
  type DocxExportOptions,
  type ExportFormat,
  type PdfExportOptions,
} from "~/lib/export/types"
import { getParentPath, writeTextFile, type MermaidThemeSetting } from "~/lib/workspace"

export type { ExportFormat, PdfExportOptions, DocxExportOptions } from "~/lib/export/types"
export {
  defaultPdfExportOptions,
  defaultDocxExportOptions,
  defaultRenderToggles,
} from "~/lib/export/types"
export { hasMermaidBlocks, extractMermaidBlocks } from "~/lib/mermaid"
export { exportMermaidBatch } from "~/lib/export/mermaid-batch"
export { renderMarkdownToHtml, buildDocumentHtml } from "~/lib/export/html"

export type ExportResult = { status: "success"; path: string } | { status: "cancelled" }

export const exportNote = async (options: {
  format: ExportFormat
  sourcePath: string
  content: string
  workspaceRoot?: string
  mermaidTheme?: MermaidThemeSetting
  pdfOptions?: PdfExportOptions
  docxOptions?: DocxExportOptions
  onProgress?: (message: string) => void
}): Promise<ExportResult> => {
  const stem = fileStem(options.sourcePath)
  const workspaceRoot = options.workspaceRoot || getParentPath(options.sourcePath)
  const onProgress = options.onProgress

  if (options.format === "normalized-md") {
    const picked = await save({
      title: "导出解析后 Markdown",
      defaultPath: `${stem}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    })
    if (!picked) {
      return { status: "cancelled" }
    }
    const target = ensureExtension(picked, "md")
    onProgress?.("正在写入文件…")
    await writeTextFile(target, normalizeMarkdownSource(options.content))
    return { status: "success", path: target }
  }

  if (options.format === "txt") {
    const picked = await save({
      title: "导出纯文本",
      defaultPath: `${stem}.txt`,
      filters: [{ name: "Text", extensions: ["txt"] }],
    })
    if (!picked) {
      return { status: "cancelled" }
    }
    const target = ensureExtension(picked, "txt")
    onProgress?.("正在写入文件…")
    await writeTextFile(target, markdownToPlainText(options.content))
    return { status: "success", path: target }
  }

  if (options.format === "html") {
    const picked = await save({
      title: "导出离线单文件 HTML",
      defaultPath: `${stem}.html`,
      filters: [{ name: "HTML", extensions: ["html"] }],
    })
    if (!picked) {
      return { status: "cancelled" }
    }
    const target = ensureExtension(picked, "html")
    onProgress?.("正在渲染离线 HTML…")
    const bodyHtml = await renderMarkdownToHtml(options.content, {
      filePath: options.sourcePath,
      workspaceRoot,
      mermaidTheme: options.mermaidTheme,
    })
    const html = buildDocumentHtml(stem, bodyHtml, { includeKatexCss: true })
    onProgress?.("正在写入文件…")
    await writeTextFile(target, html)
    return { status: "success", path: target }
  }

  if (options.format === "pdf") {
    if (!options.pdfOptions) {
      throw new Error("缺少 PDF 导出配置")
    }
    const target = await exportPdfDocument(
      {
        sourcePath: options.sourcePath,
        content: options.content,
        workspaceRoot,
        mermaidTheme: options.mermaidTheme,
        onProgress,
      },
      options.pdfOptions
    )
    if (!target) {
      return { status: "cancelled" }
    }
    return { status: "success", path: target }
  }

  if (options.format === "docx") {
    if (!options.docxOptions) {
      throw new Error("缺少 Word 导出配置")
    }
    const target = await exportDocxDocument(
      {
        sourcePath: options.sourcePath,
        content: options.content,
        workspaceRoot,
        mermaidTheme: options.mermaidTheme,
        onProgress,
      },
      options.docxOptions
    )
    if (!target) {
      return { status: "cancelled" }
    }
    return { status: "success", path: target }
  }

  throw new Error("不支持的导出格式")
}
