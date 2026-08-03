import { useMemo } from "react"

import { ScrollArea } from "~/components/ui/scroll-area"

interface OutlineItem {
  level: number
  text: string
  id: string
}

export interface OutlinePanelProps {
  content: string
  onSelectHeading?: (id: string) => void
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const extractHeadings = (content: string): OutlineItem[] => {
  const lines = content.split(/\r?\n/)
  const items: OutlineItem[] = []
  let inFencedBlock = false
  let fenceMarker = ""

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*(.*)$/)
    if (fenceMatch) {
      if (!inFencedBlock) {
        inFencedBlock = true
        fenceMarker = fenceMatch[1][0]
      } else if (fenceMatch[1].startsWith(fenceMarker)) {
        inFencedBlock = false
        fenceMarker = ""
      }
      continue
    }

    if (inFencedBlock) {
      continue
    }

    const match = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/\s+/g, " ").trim()
      if (text) {
        const id = text
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .replace(/\s+/g, "-")
        items.push({ level, text, id })
      }
    }
  }

  return items
}

export const buildHeadingSlugMap = (content: string): Map<string, string> => {
  const headings = extractHeadings(content)
  const map = new Map<string, string>()
  const counters = new Map<string, number>()

  for (const heading of headings) {
    const base = heading.id || "section"
    const count = counters.get(base) ?? 0
    const next = count + 1
    counters.set(base, next)
    const slug = count === 0 ? base : `${base}-${next}`
    map.set(escapeRegex(heading.text), slug)
  }

  return map
}

export const OutlinePanel = ({ content, onSelectHeading }: OutlinePanelProps) => {
  const headings = useMemo(() => extractHeadings(content), [content])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/40 px-4 py-3">
        <div className="text-[13px] font-medium tracking-tight">大纲</div>
        <div className="text-[11px] text-muted-foreground">{headings.length} 个标题</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {headings.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">暂无标题</div>
          ) : (
            <ul className="space-y-0.5">
              {headings.map((heading, index) => (
                <li key={`${heading.id}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onSelectHeading?.(heading.id)}
                    className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    style={{ paddingLeft: `${0.5 + (heading.level - 1) * 0.75}rem` }}
                  >
                    <span className="mr-2 text-xs text-muted-foreground/60">H{heading.level}</span>
                    <span className="truncate">{heading.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
