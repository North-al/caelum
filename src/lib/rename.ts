/** Filename validation and wiki-link helpers for rename flows. */

const ILLEGAL_CHARS = /[\\/:*?"<>|]/

export const SUPPORTED_RENAME_EXTENSIONS = ["md", "txt", "ini", "json", "xml", "svg"] as const

export type SupportedRenameExtension = (typeof SUPPORTED_RENAME_EXTENSIONS)[number]

export const hasIllegalFilenameChars = (value: string) => ILLEGAL_CHARS.test(value)

export const illegalFilenameMessage = "文件名不能包含 \\ / : * ? \" < > |"

export const splitFileName = (name: string) => {
  const base = name.split(/[\\/]/).pop() ?? name
  const dot = base.lastIndexOf(".")
  if (dot <= 0 || dot === base.length - 1) {
    return { stem: base, extension: "" }
  }
  return {
    stem: base.slice(0, dot),
    extension: base.slice(dot + 1).toLowerCase(),
  }
}

export const joinFileName = (stem: string, extension: string) => {
  const trimmedStem = stem.trim()
  const trimmedExt = extension.trim().replace(/^\./, "")
  if (!trimmedExt) {
    return trimmedStem
  }
  return `${trimmedStem}.${trimmedExt}`
}

export const isSupportedExtension = (extension: string) => {
  const normalized = extension.trim().replace(/^\./, "").toLowerCase()
  if (!normalized) {
    return false
  }
  return (SUPPORTED_RENAME_EXTENSIONS as readonly string[]).includes(normalized)
}

/** Rewrite Obsidian-style `[[stem]]` / `[[stem|alias]]` / `[[stem#heading]]` links. */
export const rewriteWikiLinks = (content: string, oldStem: string, newStem: string) => {
  if (!oldStem || oldStem === newStem) {
    return content
  }
  const escaped = oldStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`\\[\\[${escaped}(\\|[^\\]]*|#[^\\]]*)?\\]\\]`, "g")
  return content.replace(pattern, (_match, suffix: string | undefined) => `[[${newStem}${suffix ?? ""}]]`)
}

export const remapPathPrefix = (path: string, oldPath: string, nextPath: string) => {
  const normalized = path.replace(/\\/g, "/")
  const from = oldPath.replace(/\\/g, "/")
  const to = nextPath.replace(/\\/g, "/")
  if (normalized === from) {
    return to
  }
  if (normalized.startsWith(`${from}/`)) {
    return `${to}${normalized.slice(from.length)}`
  }
  return normalized
}
