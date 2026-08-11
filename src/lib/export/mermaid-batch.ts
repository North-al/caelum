import { open } from "@tauri-apps/plugin-dialog"

import { svgToPngBytes } from "~/lib/export/svg-raster"
import { extractMermaidBlocks, renderMermaidSvg } from "~/lib/mermaid"
import { combinePaths, writeBinaryFile, writeTextFile, type MermaidThemeSetting } from "~/lib/workspace"

const padIndex = (index: number, total: number) =>
  String(index).padStart(Math.max(2, String(total).length), "0")

export const exportMermaidBatch = async (options: {
  content: string
  format: "svg" | "png"
  mermaidTheme?: MermaidThemeSetting
  background?: string
  padding?: number
  scale?: number
  onProgress?: (message: string) => void
}): Promise<number> => {
  const blocks = extractMermaidBlocks(options.content)
  if (blocks.length === 0) {
    return 0
  }

  const directory = await open({
    title: options.format === "svg" ? "选择 SVG 保存目录" : "选择 PNG 保存目录",
    directory: true,
    multiple: false,
  })
  if (!directory || typeof directory !== "string") {
    return 0
  }

  let written = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const code = blocks[i]
    options.onProgress?.(`正在导出图表 ${i + 1}/${blocks.length}…`)
    const name = `mermaid-${padIndex(i + 1, blocks.length)}`
    try {
      const svg = await renderMermaidSvg(code, {
        themeSetting: options.mermaidTheme ?? "auto",
        idPrefix: `batch-${i}`,
      })
      if (!svg) {
        continue
      }
      if (options.format === "svg") {
        await writeTextFile(combinePaths(directory, `${name}.svg`), svg)
        written += 1
        continue
      }

      const bytes = await svgToPngBytes(svg, {
        background: options.background ?? "#ffffff",
        padding: options.padding ?? 16,
        scale: options.scale ?? 2,
      })
      await writeBinaryFile(combinePaths(directory, `${name}.png`), bytes)
      written += 1
    } catch {
      // Skip failed diagram; continue batch.
    }
  }

  return written
}
