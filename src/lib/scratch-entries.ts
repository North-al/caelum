export type ScratchEntryKind = "task" | "heading" | "line"

export interface ScratchEntry {
  id: string
  raw: string
  kind: ScratchEntryKind
  checked: boolean
  text: string
  tags: string[]
}

const TASK_RE = /^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const TAG_RE = /#([^\s#]+)/g

const newId = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const extractTags = (text: string) => {
  const tags: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(TAG_RE)) {
    const tag = match[1]
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }
  return tags
}

export const parseEntry = (raw: string, id = newId()): ScratchEntry => {
  const task = raw.match(TASK_RE)
  if (task) {
    const text = task[2] ?? ""
    return {
      id,
      raw,
      kind: "task",
      checked: task[1].toLowerCase() === "x",
      text,
      tags: extractTags(text),
    }
  }

  const heading = raw.match(HEADING_RE)
  if (heading) {
    const text = heading[2] ?? ""
    return {
      id,
      raw,
      kind: "heading",
      checked: false,
      text,
      tags: extractTags(text),
    }
  }

  return {
    id,
    raw,
    kind: "line",
    checked: false,
    text: raw,
    tags: extractTags(raw),
  }
}

export const serializeEntry = (entry: Pick<ScratchEntry, "kind" | "checked" | "text">) => {
  const text = entry.text
  if (entry.kind === "task") {
    return `- [${entry.checked ? "x" : " "}] ${text}`.trimEnd()
  }
  if (entry.kind === "heading") {
    return text ? `# ${text}` : "#"
  }
  return text
}

export const parseEntries = (content: string): ScratchEntry[] => {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  if (lines.length === 1 && !lines[0]) {
    return [parseEntry("")]
  }
  return lines.map((line) => parseEntry(line))
}

export const serializeEntries = (entries: ScratchEntry[]) =>
  entries.map((entry) => serializeEntry(entry)).join("\n")

export const emptyEntry = (): ScratchEntry => parseEntry("")

export const entryStats = (entries: ScratchEntry[]) => {
  const tasks = entries.filter((entry) => entry.kind === "task")
  const done = tasks.filter((entry) => entry.checked).length
  const filled = entries.filter((entry) => entry.text.trim()).length
  return {
    total: entries.length,
    filled,
    tasks: tasks.length,
    done,
  }
}
