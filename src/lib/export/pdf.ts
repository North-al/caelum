import { save } from "@tauri-apps/plugin-dialog"

import { buildDocumentHtml, buildExportCaptureHtml, renderMarkdownToHtml } from "~/lib/export/html"
import { svgToPngBytes } from "~/lib/export/svg-raster"
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

/** Approx printable height in CSS px for pagebreak avoid / diagram scaling. */
const printableHeightPx = (options: PdfExportOptions) => {
  const heightsMm: Record<PdfExportOptions["paperSize"], number> = {
    a4: 297,
    a3: 420,
    letter: 279.4,
  }
  const pageMm =
    options.orientation === "landscape"
      ? ({ a4: 210, a3: 297, letter: 215.9 } as const)[options.paperSize]
      : heightsMm[options.paperSize]
  return Math.floor(((pageMm - options.marginMm * 2) / 25.4) * 96)
}

const loadHtml2Pdf = async () => {
  const mod = await import("html2pdf.js")
  const factory = (mod as { default?: unknown }).default ?? mod
  if (typeof factory !== "function") {
    throw new Error("html2pdf 加载失败，请重启应用后再试")
  }
  return factory as () => {
    set: (options: Record<string, unknown>) => any
    from: (element: HTMLElement | string) => any
    toPdf: () => any
    get: (key: string) => Promise<any>
    outputPdf: (type: string) => Promise<Blob>
  }
}

const bytesToDataUrl = (bytes: Uint8Array, mime: string) => {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

const waitFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

/** Mount capture HTML on the host page (html2pdf clones this node, styles must be inside). */
const mountCaptureRoot = async (captureHtml: string, widthPx: number) => {
  const host = document.createElement("div")
  host.setAttribute("data-caelum-pdf-export", "true")
  host.style.cssText = `position:fixed;left:-14000px;top:0;width:${widthPx}px;background:#fff;opacity:0;pointer-events:none;z-index:-1;`
  host.innerHTML = captureHtml
  document.body.appendChild(host)
  await waitFrame()
  await waitFrame()
  const root = host.querySelector(".export-root") as HTMLElement | null
  if (!root) {
    host.remove()
    throw new Error("导出内容为空")
  }
  return { host, root }
}

/** Rasterize Mermaid SVGs to <img> so pagebreaks treat them as atomic blocks. */
const rasterizeMermaidDiagrams = async (root: HTMLElement, maxHeightPx: number) => {
  const diagrams = Array.from(root.querySelectorAll(".mermaid-diagram"))
  for (const diagram of diagrams) {
    const svg = diagram.querySelector("svg")
    if (!svg) continue
    try {
      const markup = new XMLSerializer().serializeToString(svg)
      const png = await svgToPngBytes(markup, {
        background: "#ffffff",
        padding: 8,
        scale: 2,
      })
      const img = document.createElement("img")
      img.src = bytesToDataUrl(png, "image/png")
      img.alt = "diagram"
      img.decoding = "sync"
      img.style.display = "block"
      img.style.margin = "0 auto"
      img.style.maxWidth = "100%"
      img.style.height = "auto"
      img.style.maxHeight = `${Math.max(240, maxHeightPx - 48)}px`
      img.style.pageBreakInside = "avoid"
      img.style.breakInside = "avoid"
      diagram.replaceChildren(img)
      ;(diagram as HTMLElement).style.pageBreakInside = "avoid"
      ;(diagram as HTMLElement).style.breakInside = "avoid"
    } catch {
      // Keep original SVG if rasterization fails.
    }
  }

  const images = Array.from(root.querySelectorAll("img"))
  await Promise.all(
    images.map(
      (img) =>
        img.decode?.().catch(() => undefined) ??
        new Promise<void>((resolve) => {
          if (img.complete) resolve()
          else {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          }
        })
    )
  )
}

const stampWatermark = (pdf: any, text: string) => {
  const label = text.trim()
  if (!label) return
  const total = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i)
    const width = pdf.internal.pageSize.getWidth()
    const height = pdf.internal.pageSize.getHeight()
    pdf.saveGraphicsState?.()
    try {
      if (pdf.GState) {
        pdf.setGState(new pdf.GState({ opacity: 0.14 }))
      }
    } catch {
      // Older jsPDF builds may lack GState — fall through with light gray.
    }
    pdf.setTextColor(160)
    pdf.setFontSize(42)
    pdf.text(label, width / 2, height / 2, { align: "center", angle: -28 })
    pdf.restoreGraphicsState?.()
  }
}

const stampPageNumbers = (pdf: any) => {
  const total = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i)
    const width = pdf.internal.pageSize.getWidth()
    const height = pdf.internal.pageSize.getHeight()
    pdf.setFontSize(9)
    pdf.setTextColor(120)
    pdf.text(String(i), width / 2, height - 0.35, { align: "center" })
  }
}

interface PdfLinkHotspot {
  page: number
  x: number
  y: number
  w: number
  h: number
  targetPage: number
}

/** Convert a DOM rect into PDF units using html2pdf pageSize.k (px → pdf unit). */
const toPdfBox = (rect: DOMRect, k: number) => ({
  left: rect.left * k,
  top: rect.top * k,
  width: rect.width * k,
  height: rect.height * k,
})

/**
 * Collect TOC hash-link hotspots from the html2pdf container (after pagebreak pads).
 * html2pdf's own enableLinks writes hash hrefs as external URLs — unusable for in-PDF jumps.
 */
const collectInternalLinkHotspots = (
  container: HTMLElement,
  pageSize: { k: number; inner: { height: number } },
  marginTop: number,
  marginLeft: number
): PdfLinkHotspot[] => {
  const containerBox = toPdfBox(container.getBoundingClientRect(), pageSize.k)
  const innerHeight = Math.max(0.5, pageSize.inner.height)

  const idTops = new Map<string, number>()
  container.querySelectorAll("[id]").forEach((el) => {
    const id = el.getAttribute("id")
    if (!id) return
    const box = toPdfBox((el as HTMLElement).getBoundingClientRect(), pageSize.k)
    idTops.set(id, box.top - containerBox.top)
  })

  const hotspots: PdfLinkHotspot[] = []
  container.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    const href = anchor.getAttribute("href") || ""
    const id = decodeURIComponent(href.slice(1))
    if (!id || !idTops.has(id)) return
    const targetTop = idTops.get(id) ?? 0
    const targetPage = Math.max(1, Math.floor(targetTop / innerHeight) + 1)

    Array.from(anchor.getClientRects()).forEach((rect) => {
      if (rect.width <= 0 || rect.height <= 0) return
      const box = toPdfBox(rect, pageSize.k)
      const top = box.top - containerBox.top
      const left = box.left - containerBox.left
      const page = Math.max(1, Math.floor(top / innerHeight) + 1)
      hotspots.push({
        page,
        x: marginLeft + left,
        y: marginTop + (top % innerHeight),
        w: Math.max(0.05, box.width),
        h: Math.max(0.05, box.height),
        targetPage,
      })
    })
  })
  return hotspots
}

const stampInternalLinks = (pdf: any, hotspots: PdfLinkHotspot[]) => {
  const total = pdf.internal.getNumberOfPages()
  for (const spot of hotspots) {
    const page = Math.min(total, spot.page)
    const targetPage = Math.min(total, spot.targetPage)
    pdf.setPage(page)
    pdf.link(spot.x, spot.y, spot.w, spot.h, { pageNumber: targetPage })
  }
}

const printIsolatedHtml = async (html: string) => {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:800px;height:1200px;border:0;opacity:0;pointer-events:none;"
  document.body.appendChild(iframe)
  const frameDoc = iframe.contentDocument
  const frameWin = iframe.contentWindow
  if (!frameDoc || !frameWin) {
    iframe.remove()
    throw new Error("无法创建打印预览")
  }
  frameDoc.open()
  frameDoc.write(html)
  frameDoc.close()
  await new Promise<void>((resolve) => window.setTimeout(resolve, 80))
  try {
    frameWin.focus()
    frameWin.print()
    await new Promise<void>((resolve) => window.setTimeout(resolve, 400))
  } finally {
    window.setTimeout(() => iframe.remove(), 2500)
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

  const captureHtml = buildExportCaptureHtml(bodyHtml, {
    includeKatexCss: options.render.math,
    watermarkText: options.watermarkEnabled ? options.watermarkText : undefined,
  })
  const printHtml = buildDocumentHtml(title, bodyHtml, {
    includeKatexCss: options.render.math,
    watermarkText: options.watermarkEnabled ? options.watermarkText : undefined,
  })

  ctx.onProgress?.("正在生成 PDF…")

  const widthPx = options.orientation === "landscape" ? 1100 : 800
  const maxDiagramHeight = printableHeightPx(options)
  const marginIn = options.marginMm / 25.4
  const { host, root } = await mountCaptureRoot(captureHtml, widthPx)

  try {
    await rasterizeMermaidDiagrams(root, maxDiagramHeight)

    const html2pdf = await loadHtml2Pdf()
    const worker = html2pdf()
      .set({
        margin: marginIn,
        filename: `${title}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        enableLinks: false,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: widthPx,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            const font =
              '"Microsoft YaHei", "微软雅黑", "Microsoft YaHei UI", sans-serif'
            clonedDoc.querySelectorAll(".export-root, .export-root *").forEach((node) => {
              const el = node as HTMLElement
              if (!el.style) return
              el.style.fontFamily = font
              if (/^H[1-6]$/.test(el.tagName)) {
                el.style.fontWeight = "400"
              }
            })
          },
        },
        jsPDF: {
          unit: "in",
          format: paperToJsPdfFormat(options.paperSize),
          orientation: options.orientation,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [
            "img",
            "p",
            "li",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            ".mermaid-diagram",
            ".katex-display",
            ".katex",
            "table",
            "pre",
            "blockquote",
          ],
        },
      })
      .from(root)

    let linkHotspots: PdfLinkHotspot[] = []
    await worker.toContainer().then(function collectLinks(this: any) {
      if (!options.tableOfContents) return
      const container = this.prop?.container as HTMLElement | undefined
      const pageSize = this.prop?.pageSize as
        | { k: number; inner: { height: number } }
        | undefined
      const margin = this.opt?.margin as number[] | undefined
      if (!container || !pageSize || !margin) return
      linkHotspots = collectInternalLinkHotspots(container, pageSize, margin[0], margin[1])
    })

    const pdf = await worker.toPdf().get("pdf")

    if (options.watermarkEnabled && options.watermarkText.trim()) {
      stampWatermark(pdf, options.watermarkText)
    }
    if (linkHotspots.length > 0) {
      stampInternalLinks(pdf, linkHotspots)
    }
    if (options.pageNumbers) {
      stampPageNumbers(pdf)
    }

    const blob = pdf.output("blob") as Blob
    const buffer = await blob.arrayBuffer()
    await writeBinaryFile(target, new Uint8Array(buffer))
    return target
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/oklch|unsupported color/i.test(message)) {
      ctx.onProgress?.("改用系统打印…")
      await printIsolatedHtml(printHtml)
      throw new Error("直接导出 PDF 受主题色限制。已打开打印对话框，请选择「Microsoft Print to PDF」保存。")
    }
    throw error
  } finally {
    host.remove()
  }
}
