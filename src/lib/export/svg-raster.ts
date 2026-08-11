/** Rasterize SVG without html-to-image (avoids oklch / CSS parse failures). */

export interface SvgRasterOptions {
  /** Hex or rgb() only — never oklch/hsl from theme tokens */
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

const ensureSvgSize = (svg: string): string => {
  if (/<svg[^>]*(width|viewBox)=/i.test(svg)) {
    return svg
  }
  return svg.replace(
    /<svg\b/i,
    '<svg width="800" height="600" viewBox="0 0 800 600"'
  )
}

const loadSvgImage = (svg: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const blob = new Blob([ensureSvgSize(svg)], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("无法将 SVG 转为图片"))
    }
    image.src = url
  })

/** Convert SVG markup to PNG bytes via canvas (does not read page CSS). */
export const svgToPngBytes = async (
  svg: string,
  options?: Partial<SvgRasterOptions>
): Promise<Uint8Array> => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const image = await loadSvgImage(svg)
  const width = Math.max(1, image.naturalWidth || image.width || 800)
  const height = Math.max(1, image.naturalHeight || image.height || 600)
  const pad = Math.max(0, opts.padding) * opts.scale
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(width * opts.scale + pad * 2)
  canvas.height = Math.ceil(height * opts.scale + pad * 2)

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("无法创建画布")
  }
  ctx.fillStyle = opts.background || "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, pad, pad, width * opts.scale, height * opts.scale)

  const dataUrl = canvas.toDataURL("image/png")
  const res = await fetch(dataUrl)
  const buffer = await res.arrayBuffer()
  return new Uint8Array(buffer)
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
  return `<svg xmlns="http://www.w3.org/2000/svg"${attrs} width="${nextW}" height="${nextH}">
  <rect x="${vbX - padding}" y="${vbY - padding}" width="${nextW}" height="${nextH}" fill="${background}"/>
  <g transform="translate(0,0)">${body}</g>
</svg>`
}
