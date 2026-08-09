/** Lightweight formatters for structured text files in the editor. */

export const formatJsonContent = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return "{\n  \n}\n"
  }
  return `${JSON.stringify(JSON.parse(trimmed), null, 2)}\n`
}

/** Best-effort XML pretty-print (keeps text nodes; not a full XML parser). */
export const formatXmlContent = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n'
  }

  const collapsed = trimmed.replace(/>\s+</g, "><").replace(/\r\n?/g, "\n")
  const tokens = collapsed.replace(/(>)(<)(?!\/?)/g, "$1\n$2").split("\n")
  let depth = 0
  const lines: string[] = []

  for (const raw of tokens) {
    const line = raw.trim()
    if (!line) {
      continue
    }
    if (/^<\//.test(line)) {
      depth = Math.max(0, depth - 1)
    }
    lines.push(`${"  ".repeat(depth)}${line}`)
    if (/^<[^!?/][^>]*[^/]>$/.test(line) && !/^<.+\/>$/.test(line) && !/^<.*<\/.*>$/.test(line)) {
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

export const tryFormatByExtension = (extension: string, value: string): string | null => {
  const ext = extension.toLowerCase()
  try {
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
