/**
 * Normalize task-list lines so both GFM (`- [ ]`) and bare (`[ ]`) forms work.
 * Skips fenced code blocks.
 */
export const normalizeTaskListSyntax = (markdown: string) => {
  let inFence = false

  return markdown
    .split("\n")
    .map((line) => {
      const trimmedStart = line.trimStart()
      if (trimmedStart.startsWith("```")) {
        inFence = !inFence
        return line
      }
      if (inFence) {
        return line
      }

      // Bare task lines: "[ ] task" / "[x] task"
      return line.replace(/^(\s*)\[([ xX])\](\s+)/, "$1- [$2]$3")
    })
    .join("\n")
}
