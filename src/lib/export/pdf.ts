import { save } from "@tauri-apps/plugin-dialog"

import { buildDocumentHtml, renderMarkdownToHtml } from "~/lib/export/html"
import {
  ensureExtension,
  fileStem,
  type ExportContext,
  type PdfExportOptions,
} from "~/lib/export/types"
import { writeBinaryFile } from "~/lib/workspace"

const paperToJsPdfFormat = (paper: PdfExportOptions["paperSize"]) => {
  if (paper === "letter") return "letter"
  if (paper === "a3") return "a3"
  return "a4"
}

const loadHtml2Pdf = async () => {
  const mod = await import("html2pdf.js")
  const factory = (mod as { default?: unknown }).default ?? mod
  if (typeof factory !== "function") {
    throw new Error("html2pdf 加载失败，请重启应用后再试")
  }
  return factory as () => {
    set: (options: Record<string, unknown>) => any
    from: (element: HTMLElement) => any
    toPdf: () => any
    get: (key: string) => Promise<any>
    outputPdf: (type: string) => Promise<Blob>
  }
}

export const exportPdfDocument = async (
  ctx: ExportContext,
  options: PdfExportOptions
): Promise<string | null> => {
  const title = fileStem(ctx.sourcePath)

  const picked = await save({
    title: "导出 PDF",
    defaultPath: `${title}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  })
  if (!picked) {
    return null
  }
  const target = ensureExtension(picked, "pdf")

  ctx.onProgress?.("正在渲染 Markdown…")
  const bodyHtml = await renderMarkdownToHtml(ctx.content, {
    filePath: ctx.sourcePath,
    workspaceRoot: ctx.workspaceRoot,
    render: options.render,
    mermaidTheme: ctx.mermaidTheme,
    tableOfContents: options.tableOfContents,
  })

  const html = buildDocumentHtml(title, bodyHtml, {
    includeKatexCss: options.render.math,
    watermarkText: options.watermarkEnabled ? options.watermarkText : undefined,
  })

  ctx.onProgress?.("正在生成 PDF…")

  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.left = "-10000px"
  container.style.top = "0"
  container.style.width = options.orientation === "landscape" ? "1100px" : "800px"
  container.style.background = "#ffffff"
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const html2pdf = await loadHtml2Pdf()
    const source = (container.querySelector(".export-body") as HTMLElement | null) ?? container
    const worker = html2pdf()
      .set({
        margin: options.marginMm / 25.4,
        filename: `${title}.pdf`,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "in",
          format: paperToJsPdfFormat(options.paperSize),
          orientation: options.orientation,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: ["img", ".mermaid-diagram", ".katex-display"],
        },
      })
      .from(source)

    let blob: Blob
    if (options.pageNumbers) {
      const pdf = await worker.toPdf().get("pdf")
      const total = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= total; i += 1) {
        pdf.setPage(i)
        const size = pdf.internal.pageSize
        const width = size.getWidth()
        const height = size.getHeight()
        pdf.setFontSize(9)
        pdf.setTextColor(120)
        pdf.text(String(i), width / 2, height - 0.35, { align: "center" })
      }
      blob = pdf.output("blob") as Blob
    } else {
      blob = await worker.outputPdf("blob")
    }

    const buffer = await blob.arrayBuffer()
    await writeBinaryFile(target, new Uint8Array(buffer))
    return target
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}
