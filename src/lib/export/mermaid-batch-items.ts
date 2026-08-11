import { extractMermaidBlocks } from "~/lib/mermaid"

export interface MermaidBatchItem {
  id: string
  index: number
  code: string
  kind: string
  preview: string
}

const KIND_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^(flowchart|graph)\b/i, label: "流程图" },
  { pattern: /^sequenceDiagram\b/i, label: "时序图" },
  { pattern: /^classDiagram\b/i, label: "类图" },
  { pattern: /^stateDiagram(?:-v2)?\b/i, label: "状态图" },
  { pattern: /^erDiagram\b/i, label: "ER 图" },
  { pattern: /^gantt\b/i, label: "甘特图" },
  { pattern: /^pie\b/i, label: "饼图" },
  { pattern: /^gitGraph\b/i, label: "Git 图" },
  { pattern: /^mindmap\b/i, label: "思维导图" },
  { pattern: /^timeline\b/i, label: "时间线" },
  { pattern: /^journey\b/i, label: "旅程图" },
  { pattern: /^quadrantChart\b/i, label: "象限图" },
  { pattern: /^requirementDiagram\b/i, label: "需求图" },
  { pattern: /^sankey-beta\b/i, label: "桑基图" },
  { pattern: /^xychart-beta\b/i, label: "XY 图" },
  { pattern: /^block-beta\b/i, label: "块图" },
  { pattern: /^kanban\b/i, label: "看板" },
]

export const detectMermaidKind = (code: string) => {
  const first = code.trim().split(/\r?\n/, 1)[0]?.trim() ?? ""
  for (const item of KIND_LABELS) {
    if (item.pattern.test(first)) {
      return item.label
    }
  }
  return "Mermaid"
}

export const listMermaidBatchItems = (markdown: string): MermaidBatchItem[] =>
  extractMermaidBlocks(markdown).map((code, index) => {
    const kind = detectMermaidKind(code)
    const preview = code
      .trim()
      .split(/\r?\n/)
      .slice(0, 3)
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 72)
    return {
      id: `mermaid-${index}`,
      index,
      code,
      kind,
      preview: preview.length >= 72 ? `${preview}…` : preview,
    }
  })
