/** Rasterize SVG without html-to-image (avoids oklch / CSS parse failures). */

export interface SvgRasterOptions {
  /** Hex / rgb() / "transparent" — never oklch/hsl from theme tokens */
  background: string
  /** Padding around the diagram in CSS pixels (pre-scale) */
  padding: number
  /** Pixel ratio / scale factor */
  scale: number
}

const DEFAULT_OPTIONS: SvgRasterOptions = {
  background: "#ffffff",
  padding: 16,
  scale: 2,
}

const isTransparent = (background: string) => {
  const value = background.trim().toLowerCase()
  return value === "transparent" || value === "none" || value === ""
}

const hasForeignObject = (svg: string) => /<foreignObject\b/i.test(svg)

/**
 * Light sanitize for canvas / DOM capture.
 * Do NOT strip foreignObject — Mermaid labels live there; stripping removes all text.
 */
export const sanitizeSvgForCanvas = (svg: string): string => {
  let out = svg.trim()
  if (!out) return out

  if (!/^<svg\b/i.test(out)) {
    const start = out.indexOf("<svg")
    if (start >= 0) out = out.slice(start)
  }

  if (!/\sxmlns=/.test(out)) {
    out = out.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  if (!/\sxmlns:xlink=/.test(out) && /xlink:/i.test(out)) {
    out = out.replace(/<svg\b/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
  }

  out = out
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<(?:image|img)\b[^>]*(?:href|xlink:href)=["']https?:[^"']*["'][^>]*\/?>/gi, "")
    .replace(/<(?:image|img)\b[^>]*(?:href|xlink:href)=["']\/\/[^"']*["'][^>]*\/?>/gi, "")

  if (!/\swidth=/i.test(out) || !/\sheight=/i.test(out)) {
    const vb = /viewBox=["']([^"']+)["']/i.exec(out)
    if (vb) {
      const parts = vb[1].trim().split(/[\s,]+/).map(Number)
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const w = Math.max(1, parts[2])
        const h = Math.max(1, parts[3])
        out = out.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
          const next = attrs.replace(/\s(width|height)=["'][^"']*["']/gi, "").trim()
          return `<svg ${next} width="${w}" height="${h}">`
        })
      }
    }
  }

  return out
}

/**
 * Replace foreignObject HTML labels with SVG <text> so Image+canvas works
 * (FO + drawImage taints / blanks; FO + foreignObjectRendering often paints black).
 */
export const flattenForeignObjectLabels = (svg: string): string => {
  if (typeof DOMParser === "undefined" || !hasForeignObject(svg)) {
    return svg
  }

  try {
    const prepared = sanitizeSvgForCanvas(svg)
    const doc = new DOMParser().parseFromString(prepared, "image/svg+xml")
    if (doc.querySelector("parsererror")) {
      return svg
    }

    const root = doc.documentElement
    root.querySelectorAll("foreignObject").forEach((fo) => {
      const text = (fo.textContent ?? "").replace(/\s+/g, " ").trim()
      if (!text) {
        fo.remove()
        return
      }

      const x = Number.parseFloat(fo.getAttribute("x") ?? "0") || 0
      const y = Number.parseFloat(fo.getAttribute("y") ?? "0") || 0
      const width = Number.parseFloat(fo.getAttribute("width") ?? "0") || 0
      const height = Number.parseFloat(fo.getAttribute("height") ?? "0") || 0

      const textEl = doc.createElementNS("http://www.w3.org/2000/svg", "text")
      textEl.setAttribute("x", String(x + width / 2))
      textEl.setAttribute("y", String(y + height / 2))
      textEl.setAttribute("text-anchor", "middle")
      textEl.setAttribute("dominant-baseline", "middle")
      textEl.setAttribute("fill", "#1f2937")
      textEl.setAttribute(
        "font-family",
        '"Microsoft YaHei","微软雅黑","Segoe UI",sans-serif'
      )
      textEl.setAttribute("font-size", "14")
      textEl.textContent = text
      fo.replaceWith(textEl)
    })

    return new XMLSerializer().serializeToString(root)
  } catch {
    return svg
  }
}

const ensureSvgSize = (svg: string): string => {
  if (/<svg[^>]*(width|viewBox)=/i.test(svg)) {
    return svg
  }
  return svg.replace(/<svg\b/i, '<svg width="800" height="600" viewBox="0 0 800 600"')
}

const loadSvgImage = (svg: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const prepared = ensureSvgSize(sanitizeSvgForCanvas(svg))
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(prepared)}`
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("无法将 SVG 转为图片"))
    image.src = url
  })

const canvasToPngBytes = async (canvas: HTMLCanvasElement): Promise<Uint8Array> => {
  let dataUrl: string
  try {
    dataUrl = canvas.toDataURL("image/png")
  } catch {
    throw new Error("图表含无法导出的外部资源，请重试或改用 SVG 导出")
  }
  const res = await fetch(dataUrl)
  const buffer = await res.arrayBuffer()
  return new Uint8Array(buffer)
}

const isMostlyBlankOrBlack = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx || canvas.width < 2 || canvas.height < 2) {
    return true
  }

  const { width, height } = canvas
  const sample = ctx.getImageData(0, 0, width, height).data
  let opaque = 0
  let dark = 0
  let lightish = 0
  const step = Math.max(4, Math.floor((width * height) / 4000) * 4)

  for (let i = 0; i < sample.length; i += step) {
    const a = sample[i + 3]
    if (a < 8) continue
    opaque++
    const r = sample[i]
    const g = sample[i + 1]
    const b = sample[i + 2]
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (lum < 28) dark++
    if (lum > 40) lightish++
  }

  if (opaque < 12) return true
  // Solid black / near-black failed FO captures
  if (dark / opaque > 0.92 && lightish / opaque < 0.05) return true
  return false
}

/**
 * Mount SVG in the DOM and capture with html2canvas-pro.
 * foreignObjectRendering MUST stay false — true often yields solid black PNGs
 * for Mermaid flowchart / classDiagram labels.
 */
const rasterizeViaHtml2Canvas = async (
  svg: string,
  opts: SvgRasterOptions
): Promise<Uint8Array> => {
  const html2canvas = (await import("html2canvas-pro")).default
  const prepared = ensureSvgSize(sanitizeSvgForCanvas(svg))
  const pad = Math.max(0, opts.padding)
  const host = document.createElement("div")
  host.setAttribute("data-caelum-svg-raster", "true")
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    `padding:${pad}px`,
    `background:${isTransparent(opts.background) ? "transparent" : opts.background}`,
    "display:inline-block",
    "line-height:0",
    "color:#1f2937",
    'font-family:"Microsoft YaHei","微软雅黑","Segoe UI",sans-serif',
  ].join(";")
  host.innerHTML = prepared

  host.querySelectorAll("foreignObject, foreignObject *").forEach((node) => {
    const el = node as HTMLElement
    if (el.style) {
      el.style.color = el.style.color || "#1f2937"
      el.style.background = el.style.background || "transparent"
    }
  })

  document.body.appendChild(host)
  try {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    const canvas = await html2canvas(host, {
      backgroundColor: isTransparent(opts.background) ? null : opts.background,
      scale: opts.scale,
      logging: false,
      useCORS: true,
      allowTaint: false,
      // true → black rectangles for Mermaid FO labels in WebView2
      foreignObjectRendering: false,
    })
    if (isMostlyBlankOrBlack(canvas)) {
      throw new Error("html2canvas produced blank/black output")
    }
    return canvasToPngBytes(canvas)
  } finally {
    host.remove()
  }
}

const rasterizeViaImage = async (svg: string, opts: SvgRasterOptions): Promise<Uint8Array> => {
  const image = await loadSvgImage(svg)
  const width = Math.max(1, image.naturalWidth || image.width || 800)
  const height = Math.max(1, image.naturalHeight || image.height || 600)
  const pad = Math.max(0, opts.padding) * opts.scale
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(width * opts.scale + pad * 2)
  canvas.height = Math.ceil(height * opts.scale + pad * 2)

  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) {
    throw new Error("无法创建画布")
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!isTransparent(opts.background)) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(image, pad, pad, width * opts.scale, height * opts.scale)
  if (isMostlyBlankOrBlack(canvas)) {
    throw new Error("SVG 栅格化结果为空")
  }
  return canvasToPngBytes(canvas)
}

/** Convert SVG markup to PNG bytes via canvas (does not read page CSS). */
export const svgToPngBytes = async (
  svg: string,
  options?: Partial<SvgRasterOptions>
): Promise<Uint8Array> => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const errors: string[] = []

  // Prefer FO-free SVG → Image path (stable for flowchart / classDiagram).
  const flattened = flattenForeignObjectLabels(svg)
  if (!hasForeignObject(flattened)) {
    try {
      return await rasterizeViaImage(flattened, opts)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (!hasForeignObject(svg)) {
    try {
      return await rasterizeViaImage(svg, opts)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  try {
    return await rasterizeViaHtml2Canvas(flattened, opts)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  try {
    return await rasterizeViaHtml2Canvas(svg, opts)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    throw new Error(errors.filter(Boolean).join("；") || "无法导出 PNG")
  }
}

/** Wrap SVG with a solid background rect for standalone SVG export. */
export const wrapSvgWithBackground = (
  svg: string,
  options?: Partial<Pick<SvgRasterOptions, "background" | "padding">>
) => {
  const background = options?.background ?? "#ffffff"
  const padding = Math.max(0, options?.padding ?? 16)
  const match = /<svg\b([^>]*)>/i.exec(svg)
  if (!match) {
    return svg
  }

  let attrs = match[1]
  const viewBoxMatch = /viewBox=["']([^"']+)["']/i.exec(attrs)
  let vbX = 0
  let vbY = 0
  let vbW = 800
  let vbH = 600
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      ;[vbX, vbY, vbW, vbH] = parts
    }
  }

  const nextW = vbW + padding * 2
  const nextH = vbH + padding * 2
  const nextViewBox = `${vbX - padding} ${vbY - padding} ${nextW} ${nextH}`

  attrs = attrs
    .replace(/viewBox=["'][^"']*["']/i, `viewBox="${nextViewBox}"`)
    .replace(/\s(width|height)=["'][^"']*["']/gi, "")

  if (!/viewBox=/i.test(attrs)) {
    attrs += ` viewBox="${nextViewBox}"`
  }

  const body = svg.replace(/<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "")
  const bgRect = isTransparent(background)
    ? ""
    : `<rect x="${vbX - padding}" y="${vbY - padding}" width="${nextW}" height="${nextH}" fill="${background}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg"${attrs} width="${nextW}" height="${nextH}">
  ${bgRect}
  <g transform="translate(0,0)">${body}</g>
</svg>`
}
