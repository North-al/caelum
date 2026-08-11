import { normalizeTaskListSyntax } from "~/lib/task-list"

/** Collapse 3+ blank lines to at most 2; trim trailing spaces; unify newlines. */
const tidyWhitespace = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    + "\n"

/**
 * Normalize Markdown for export: GFM task lists, tidy whitespace.
 * Keeps math ($/$$) and mermaid fenced blocks as editable source.
 */
export const normalizeMarkdownSource = (markdown: string): string => {
  return tidyWhitespace(normalizeTaskListSyntax(markdown))
}

/**
 * Strip Markdown to plain text: remove fences (incl. mermaid), math, links keep text, etc.
 */
export const markdownToPlainText = (markdown: string): string => {
  let text = markdown.replace(/\r\n/g, "\n")

  // Fenced code blocks (including mermaid)
  text = text.replace(/```[\w+-]*\s*\n[\s\S]*?```/g, "")
  // Indented code blocks
  text = text.replace(/^(?: {4}|\t).+$/gm, "")
  // Math blocks and inline
  text = text.replace(/\$\$[\s\S]*?\$\$/g, "")
  text = text.replace(/\$[^$\n]+\$/g, "")
  // Images
  text = text.replace(/!\[[^\]]*]\([^)]*\)/g, "")
  // Links keep label
  text = text.replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
  // Wiki links
  text = text.replace(/\[\[([^\]|#]+)(?:\|[^\]]+)?(?:#[^\]]+)?]]/g, "$1")
  // Headings markers
  text = text.replace(/^#{1,6}\s+/gm, "")
  // Bold / italic / strike
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2")
  text = text.replace(/(\*|_)(.*?)\1/g, "$2")
  text = text.replace(/~~(.*?)~~/g, "$1")
  // Inline code
  text = text.replace(/`([^`]+)`/g, "$1")
  // Blockquotes
  text = text.replace(/^>\s?/gm, "")
  // Lists
  text = text.replace(/^\s*[-*+]\s+/gm, "")
  text = text.replace(/^\s*\d+\.\s+/gm, "")
  // Task list leftovers
  text = text.replace(/^\s*\[[ xX]]\s+/gm, "")
  // Horizontal rules
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, "")
  // Tables: drop pipes lightly
  text = text.replace(/^\|(.+)\|$/gm, (_, row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join("\t")
  )
  text = text.replace(/^\|?[\s:-]+\|[\s|:-]*$/gm, "")

  return tidyWhitespace(text)
}
