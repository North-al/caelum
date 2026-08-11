import type { MermaidThemeSetting } from "~/lib/workspace"

export type ExportFormat = "normalized-md" | "txt" | "html" | "pdf" | "docx"

export interface RenderToggles {
  mermaid: boolean
  math: boolean
  codeHighlight: boolean
}

export const defaultRenderToggles: RenderToggles = {
  mermaid: true,
  math: true,
  codeHighlight: true,
}

export type PdfPaperSize = "a4" | "letter" | "a3"
export type PdfOrientation = "portrait" | "landscape"

export interface PdfExportOptions {
  paperSize: PdfPaperSize
  orientation: PdfOrientation
  /** Margin in mm */
  marginMm: number
  render: RenderToggles
  pageNumbers: boolean
  watermarkEnabled: boolean
  watermarkText: string
  tableOfContents: boolean
}

export const defaultPdfExportOptions: PdfExportOptions = {
  paperSize: "a4",
  orientation: "portrait",
  marginMm: 16,
  render: { ...defaultRenderToggles },
  pageNumbers: true,
  watermarkEnabled: false,
  watermarkText: "Caelum",
  tableOfContents: false,
}

export type DocxCompatMode = "office" | "wps"

export interface DocxExportOptions {
  compatMode: DocxCompatMode
  /** SVG/image clarity scale (1–3) */
  vectorScale: number
  tableOfContents: boolean
  render: RenderToggles
}

export const defaultDocxExportOptions: DocxExportOptions = {
  compatMode: "office",
  vectorScale: 2,
  tableOfContents: false,
  render: { ...defaultRenderToggles },
}

export interface ExportContext {
  sourcePath: string
  content: string
  workspaceRoot: string
  mermaidTheme?: MermaidThemeSetting
  onProgress?: (message: string) => void
}

export const fileStem = (path: string) => {
  const name = path.split(/[\\/]/).pop() ?? "note"
  return name.replace(/\.[^.]+$/, "") || "note"
}

export const ensureExtension = (path: string, extension: string) => {
  const normalized = path.replace(/\\/g, "/")
  if (normalized.toLowerCase().endsWith(`.${extension}`)) {
    return path
  }
  return `${path}.${extension}`
}

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
