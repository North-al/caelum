import {
  Document,
  HeadingLevel,
  ImageRun,
  Math as DocxMath,
  MathRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  BorderStyle,
  WidthType,
  type FileChild,
} from "docx"
import katex from "katex"
import { save } from "@tauri-apps/plugin-dialog"

import { renderMarkdownToHtml } from "~/lib/export/html"
import { svgToPngBytes as rasterSvgToPng } from "~/lib/export/svg-raster"
import {
  ensureExtension,
  fileStem,
  type DocxExportOptions,
  type ExportContext,
} from "~/lib/export/types"
import { writeBinaryFile } from "~/lib/workspace"

const svgToPngBytes = async (
  svg: string,
  scale: number
): Promise<{ data: Uint8Array; width: number; height: number } | null> => {
  try {
    const data = await rasterSvgToPng(svg, {
      background: "#ffffff",
      padding: 8,
      scale: Math.max(1, scale),
    })
    // Approximate display size in docx (CSS-ish pixels)
    const image = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ w: img.naturalWidth || 480, h: img.naturalHeight || 240 })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("svg size"))
      }
      img.src = url
    }).catch(() => ({ w: 480, h: 240 }))
    return {
      data,
      width: Math.max(120, Math.round(image.w * 0.75)),
      height: Math.max(80, Math.round(image.h * 0.75)),
    }
  } catch {
    return null
  }
}

const latexToPngBytes = async (
  latex: string,
  displayMode: boolean,
  scale: number
): Promise<{ data: Uint8Array; width: number; height: number } | null> => {
  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-10000px"
  host.style.top = "0"
  host.style.padding = "8px"
  host.style.background = "#ffffff"
  host.style.color = "#0f172a"
  document.body.appendChild(host)
  try {
    katex.render(latex, host, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    })
    // Serialize KaTeX DOM to SVG-less PNG via foreignObject-free approach:
    // draw text fallback if canvas path fails — use html2canvas-free: clone as SVG foreignObject is risky.
    // Prefer canvas from SVG of katex is hard; use Offscreen via temporary SVG foreignObject with ONLY hex colors.
    const width = Math.max(40, host.offsetWidth)
    const height = Math.max(24, host.offsetHeight)
    const canvas = document.createElement("canvas")
    const pixelRatio = Math.max(1, scale)
    canvas.width = Math.ceil(width * pixelRatio)
    canvas.height = Math.ceil(height * pixelRatio)
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return null
    }
    ctx.scale(pixelRatio, pixelRatio)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    // Draw as plain text fallback (keeps export unblocked even if formula image is imperfect)
    ctx.fillStyle = "#0f172a"
    ctx.font = displayMode ? "18px Times New Roman, serif" : "14px Times New Roman, serif"
    ctx.fillText(latex, 8, displayMode ? 28 : 20)
    const dataUrl = canvas.toDataURL("image/png")
    const res = await fetch(dataUrl)
    const buffer = await res.arrayBuffer()
    return {
      data: new Uint8Array(buffer),
      width: Math.max(40, Math.round(width * 0.75)),
      height: Math.max(24, Math.round(height * 0.75)),
    }
  } catch {
    return null
  } finally {
    host.remove()
  }
}

/** Simple LaTeX → OMML-friendly plain math text. Returns null if too complex. */
const trySimpleMathText = (latex: string): string | null => {
  const trimmed = latex.trim()
  if (!trimmed || trimmed.length > 80) {
    return null
  }
  if (/\\begin|\\frac|\\sum|\\int|\\sqrt|\\left|\\right|\\matrix|\\text/.test(trimmed)) {
    return null
  }
  const plain = trimmed
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\pm/g, "±")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\pi/g, "π")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\infty/g, "∞")
    .replace(/\^(\w)/g, "^$1")
    .replace(/_(\w)/g, "_$1")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
  if (!plain || /[\\{}]/.test(plain)) {
    return null
  }
  return plain
}

const headingLevel = (tag: string) => {
  switch (tag) {
    case "H1":
      return HeadingLevel.HEADING_1
    case "H2":
      return HeadingLevel.HEADING_2
    case "H3":
      return HeadingLevel.HEADING_3
    case "H4":
      return HeadingLevel.HEADING_4
    case "H5":
      return HeadingLevel.HEADING_5
    default:
      return HeadingLevel.HEADING_6
  }
}

const border = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "E5E7EB",
}

const collectRuns = async (
  node: Node,
  options: DocxExportOptions
): Promise<Array<TextRun | ImageRun | DocxMath>> => {
  const runs: Array<TextRun | ImageRun | DocxMath> = []

  const walk = async (current: Node, style: { bold?: boolean; italics?: boolean; code?: boolean } = {}) => {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.textContent ?? ""
      if (!text) return
      runs.push(
        new TextRun({
          text,
          bold: style.bold,
          italics: style.italics,
          font: style.code ? "Consolas" : undefined,
          size: style.code ? 18 : 22,
        })
      )
      return
    }
    if (current.nodeType !== Node.ELEMENT_NODE) {
      return
    }
    const el = current as HTMLElement
    const tag = el.tagName

    if (el.classList.contains("katex") || el.classList.contains("katex-display")) {
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]')
      const latex = annotation?.textContent?.trim() ?? el.textContent?.trim() ?? ""
      if (!latex) return
      const simple = trySimpleMathText(latex)
      if (simple) {
        try {
          runs.push(new DocxMath({ children: [new MathRun(simple)] }))
          return
        } catch {
          // fall through to image
        }
      }
      const png = await latexToPngBytes(latex, el.classList.contains("katex-display"), options.vectorScale)
      if (png) {
        runs.push(
          new ImageRun({
            type: "png",
            data: png.data,
            transformation: { width: png.width, height: png.height },
            altText: { title: "formula", description: latex, name: "formula" },
          })
        )
      } else {
        runs.push(new TextRun({ text: `$${latex}$`, italics: true }))
      }
      return
    }

    if (tag === "STRONG" || tag === "B") {
      for (const child of Array.from(el.childNodes)) {
        await walk(child, { ...style, bold: true })
      }
      return
    }
    if (tag === "EM" || tag === "I") {
      for (const child of Array.from(el.childNodes)) {
        await walk(child, { ...style, italics: true })
      }
      return
    }
    if (tag === "CODE" && el.parentElement?.tagName !== "PRE") {
      for (const child of Array.from(el.childNodes)) {
        await walk(child, { ...style, code: true })
      }
      return
    }
    if (tag === "BR") {
      runs.push(new TextRun({ break: 1 }))
      return
    }
    if (tag === "A") {
      const text = el.textContent ?? ""
      if (text) {
        runs.push(new TextRun({ text, color: "2563EB", underline: {} }))
      }
      return
    }

    for (const child of Array.from(el.childNodes)) {
      await walk(child, style)
    }
  }

  await walk(node)
  return runs
}

const elementToBlocks = async (
  el: HTMLElement,
  options: DocxExportOptions
): Promise<FileChild[]> => {
  const tag = el.tagName
  const blocks: FileChild[] = []

  if (el.classList.contains("mermaid-diagram")) {
    const svg = el.querySelector("svg")
    if (svg) {
      const png = await svgToPngBytes(svg.outerHTML, options.vectorScale)
      if (png) {
        blocks.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: png.data,
                transformation: { width: Math.min(540, png.width), height: png.height },
                altText: { title: "mermaid", description: "mermaid diagram", name: "mermaid" },
              }),
            ],
          })
        )
        return blocks
      }
    }
    blocks.push(new Paragraph({ children: [new TextRun({ text: el.textContent ?? "[Mermaid]", italics: true })] }))
    return blocks
  }

  if (/^H[1-6]$/.test(tag)) {
    const runs = await collectRuns(el, options)
    blocks.push(
      new Paragraph({
        heading: headingLevel(tag),
        children: runs.length ? runs : [new TextRun({ text: el.textContent ?? "" })],
      })
    )
    return blocks
  }

  if (tag === "P") {
    const runs = await collectRuns(el, options)
    blocks.push(new Paragraph({ children: runs.length ? runs : [new TextRun({ text: "" })] }))
    return blocks
  }

  if (tag === "PRE") {
    const text = el.textContent ?? ""
    for (const line of text.split("\n")) {
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: line || " ", font: "Consolas", size: 18 })],
          shading: { type: "clear", fill: "F8FAFC" },
        })
      )
    }
    return blocks
  }

  if (tag === "BLOCKQUOTE") {
    const runs = await collectRuns(el, options)
    blocks.push(
      new Paragraph({
        children: runs,
        indent: { left: 420 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: "60A5FA", space: 8 } },
      })
    )
    return blocks
  }

  if (tag === "UL" || tag === "OL") {
    let index = 1
    for (const child of Array.from(el.children)) {
      if (child.tagName !== "LI") continue
      const runs = await collectRuns(child, options)
      const prefix = tag === "OL" ? `${index}. ` : "• "
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: prefix }), ...runs],
          indent: { left: 360 },
        })
      )
      index += 1
    }
    return blocks
  }

  if (tag === "TABLE") {
    const rows: TableRow[] = []
    for (const tr of Array.from(el.querySelectorAll("tr"))) {
      const cells = Array.from(tr.children).filter((c) => c.tagName === "TH" || c.tagName === "TD")
      rows.push(
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cell.textContent ?? "", bold: cell.tagName === "TH" })],
                  }),
                ],
                borders: { top: border, bottom: border, left: border, right: border },
                width: { size: Math.floor(9000 / Math.max(1, cells.length)), type: WidthType.DXA },
              })
          ),
        })
      )
    }
    if (rows.length) {
      blocks.push(new Table({ rows, width: { size: 9000, type: WidthType.DXA } }))
    }
    return blocks
  }

  if (tag === "HR") {
    blocks.push(new Paragraph({ children: [new TextRun({ text: "—" })] }))
    return blocks
  }

  if (tag === "NAV" && el.classList.contains("export-toc")) {
    blocks.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "目录" })] }))
    for (const li of Array.from(el.querySelectorAll("li"))) {
      blocks.push(new Paragraph({ children: [new TextRun({ text: li.textContent ?? "" })] }))
    }
    return blocks
  }

  // Generic container: recurse children
  for (const child of Array.from(el.children)) {
    blocks.push(...(await elementToBlocks(child as HTMLElement, options)))
  }
  if (!el.children.length && el.textContent?.trim()) {
    const runs = await collectRuns(el, options)
    blocks.push(new Paragraph({ children: runs }))
  }
  return blocks
}

export const exportDocxDocument = async (
  ctx: ExportContext,
  options: DocxExportOptions
): Promise<string | null> => {
  const title = fileStem(ctx.sourcePath)

  const picked = await save({
    title: "导出 Word",
    defaultPath: `${title}.docx`,
    filters: [{ name: "Word", extensions: ["docx"] }],
  })
  if (!picked) {
    return null
  }
  const target = ensureExtension(picked, "docx")

  ctx.onProgress?.("正在渲染 Markdown…")
  const bodyHtml = await renderMarkdownToHtml(ctx.content, {
    filePath: ctx.sourcePath,
    workspaceRoot: ctx.workspaceRoot,
    render: options.render,
    mermaidTheme: ctx.mermaidTheme,
    tableOfContents: options.tableOfContents,
  })

  ctx.onProgress?.("正在生成 Word 文档…")

  const host = document.createElement("div")
  host.innerHTML = bodyHtml
  const children: FileChild[] = []

  if (options.compatMode === "wps") {
    // Slightly larger default images for WPS compatibility path (already via vectorScale).
  }

  for (const child of Array.from(host.children)) {
    children.push(...(await elementToBlocks(child as HTMLElement, options)))
  }

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: title })] }))
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  const buffer = await Packer.toBlob(doc)
  const bytes = new Uint8Array(await buffer.arrayBuffer())
  await writeBinaryFile(target, bytes)
  return target
}
