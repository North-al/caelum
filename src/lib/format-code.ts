/** Lightweight formatters for structured text files in the editor. */

/**
 * Pretty-print JSON without parsing to an object, so duplicate keys are preserved.
 * Falls back to native stringify when the input is already uniquely-keyed valid JSON
 * that the structural walk can't improve (never used to drop keys).
 */
export const formatJsonContent = (value: string) => {
  const source = value.replace(/^\uFEFF/, "").trim()
  if (!source) {
    return "{\n  \n}\n"
  }

  let result = ""
  let depth = 0
  let inString = false
  let escaped = false

  const indent = () => "  ".repeat(depth)
  const lastNonWs = () => {
    for (let i = result.length - 1; i >= 0; i -= 1) {
      const ch = result[i]
      if (ch !== " " && ch !== "\n" && ch !== "\t" && ch !== "\r") {
        return ch
      }
    }
    return ""
  }

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]!

    if (inString) {
      result += ch
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      result += ch
      continue
    }

    if (/\s/.test(ch)) {
      continue
    }

    if (ch === "{" || ch === "[") {
      result += ch
      depth += 1
      // peek next non-ws
      let j = i + 1
      while (j < source.length && /\s/.test(source[j]!)) j += 1
      const next = source[j]
      if (next !== "}" && next !== "]") {
        result += `\n${indent()}`
      }
      continue
    }

    if (ch === "}" || ch === "]") {
      depth = Math.max(0, depth - 1)
      const prev = lastNonWs()
      if (prev !== "{" && prev !== "[") {
        result += `\n${indent()}`
      }
      result += ch
      continue
    }

    if (ch === ",") {
      result += ch
      result += `\n${indent()}`
      continue
    }

    if (ch === ":") {
      result += ": "
      continue
    }

    result += ch
  }

  return `${result.trim()}\n`
}

/** Best-effort XML pretty-print with real indentation (not a compress pass). */
export const formatXmlContent = (value: string) => {
  const trimmed = value.replace(/^\uFEFF/, "").trim()
  if (!trimmed) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'
  }

  const normalized = trimmed
    .replace(/\r\n?/g, "\n")
    .replace(/>\s+</g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  let depth = 0
  const lines: string[] = []

  for (const line of normalized) {
    const isClosing = /^<\//.test(line)
    const isDeclaration = /^<\?/.test(line) || /^<!/.test(line)
    const isSelfClosing = /\/>$/.test(line)
    const isInlinePair = /^<[^>]+>.*<\/[^>]+>$/.test(line) && !isSelfClosing
    const isOpening =
      /^</.test(line) && !isClosing && !isDeclaration && !isSelfClosing && !isInlinePair

    if (isClosing) {
      depth = Math.max(0, depth - 1)
    }

    lines.push(`${"  ".repeat(depth)}${line}`)

    if (isOpening) {
      depth += 1
    }
  }

  return `${lines.join("\n")}\n`
}

/** Normalize INI: trim keys/values, keep sections, drop trailing spaces. */
export const formatIniContent = (value: string) => {
  const lines = value.replace(/\r\n?/g, "\n").split("\n")
  const output: string[] = []
  let pendingBlank = false

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      pendingBlank = output.length > 0
      continue
    }
    if (pendingBlank) {
      output.push("")
      pendingBlank = false
    }
    if (trimmed.startsWith(";") || trimmed.startsWith("#")) {
      output.push(trimmed)
      continue
    }
    if (/^\[[^\]]+]$/.test(trimmed)) {
      if (output.length > 0 && output[output.length - 1] !== "") {
        output.push("")
      }
      output.push(trimmed)
      continue
    }
    const eq = trimmed.indexOf("=")
    if (eq === -1) {
      output.push(trimmed)
      continue
    }
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    output.push(`${key}=${val}`)
  }

  return output.length ? `${output.join("\n")}\n` : "[section]\nkey=value\n"
}

/** Soft Markdown tidy: trailing spaces, list spacing, heading gaps, blank-line collapse. */
export const formatMarkdownContent = (value: string) => {
  let text = value.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")

  const fences: string[] = []
  text = text.replace(/```[\s\S]*?```/g, (block) => {
    const index = fences.length
    fences.push(block)
    return `\0FENCE${index}\0`
  })

  const maths: string[] = []
  text = text.replace(/\$\$[\s\S]*?\$\$/g, (block) => {
    const index = maths.length
    maths.push(block)
    return `\0MATH${index}\0`
  })

  let lines = text.split("\n").map((line) => line.replace(/[ \t]+$/g, ""))

  lines = lines.map((line) => {
    const bullet = /^([ \t]*)([-*+])(\S.*)$/.exec(line)
    if (bullet) {
      return `${bullet[1]}${bullet[2]} ${bullet[3]}`
    }
    const ordered = /^([ \t]*)(\d+\.)(\S.*)$/.exec(line)
    if (ordered) {
      return `${ordered[1]}${ordered[2]} ${ordered[3]}`
    }
    return line
  })

  const out: string[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const isHeading = /^#{1,6}(\s|$)/.test(line)
    if (isHeading && out.length > 0 && out[out.length - 1] !== "") {
      out.push("")
    }
    out.push(line)
  }

  text = out.join("\n").replace(/\n{3,}/g, "\n\n")
  text = text.replace(/\0FENCE(\d+)\0/g, (_m, index: string) => fences[Number(index)] ?? "")
  text = text.replace(/\0MATH(\d+)\0/g, (_m, index: string) => maths[Number(index)] ?? "")
  return `${text.replace(/\s+$/g, "")}\n`
}

export const tryFormatByExtension = (extension: string, value: string): string | null => {
  const ext = extension.toLowerCase()
  try {
    if (ext === "md" || ext === "markdown") {
      return formatMarkdownContent(value)
    }
    if (ext === "json") {
      return formatJsonContent(value)
    }
    if (ext === "xml" || ext === "svg") {
      return formatXmlContent(value)
    }
    if (ext === "ini") {
      return formatIniContent(value)
    }
  } catch {
    return null
  }
  return null
}
