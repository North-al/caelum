import { invoke } from "@tauri-apps/api/core"

export const normalizePath = (value: string) => value.replace(/\\/g, "/")

export const combinePaths = (base: string, child: string) => {
  const cleanedBase = normalizePath(base).replace(/\/+$/, "")
  const cleanedChild = normalizePath(child).replace(/^\/+/, "")

  if (!cleanedBase) {
    return cleanedChild
  }

  return `${cleanedBase}/${cleanedChild}`
}

/** Join base + relative and resolve `.` / `..` segments. */
export const resolveJoinedPath = (base: string, relative: string) => {
  const normalizedRelative = normalizePath(relative)

  if (/^[A-Za-z]:[\\/]/.test(normalizedRelative)) {
    return normalizePath(normalizedRelative)
  }

  const baseNormalized = normalizePath(base).replace(/\/+$/, "")
  if (normalizedRelative.startsWith("/") && !/^[A-Za-z]:/.test(baseNormalized)) {
    return normalizePath(normalizedRelative)
  }

  const baseHref = `file:///${baseNormalized}/`
  const resolved = new URL(normalizedRelative, baseHref)
  let path = decodeURIComponent(resolved.pathname)
  if (/^\/[A-Za-z]:\//.test(path)) {
    path = path.slice(1)
  }
  return normalizePath(path)
}

export const getParentPath = (value: string) => {
  const normalized = normalizePath(value)
  const separatorIndex = normalized.lastIndexOf("/")

  if (separatorIndex <= 0) {
    return ""
  }

  return normalized.slice(0, separatorIndex)
}

export const ensureFileExtension = (name: string, extension: string) => {
  const trimmed = name.trim()
  const normalizedExt = extension.replace(/^\./, "").toLowerCase() || "md"
  if (!trimmed) {
    return `untitled.${normalizedExt}`
  }

  if (trimmed.includes(".")) {
    return trimmed
  }

  return `${trimmed}.${normalizedExt}`
}

export const ensureMarkdownExtension = (name: string) => ensureFileExtension(name, "md")

export const pathExists = async (path: string): Promise<boolean> => invoke<boolean>("path_exists", { path })

/** Allocate note.md / note-1.md / note-2.md style unique names. */
export const allocateUniqueFileName = async (directory: string, desiredName: string) => {
  const fileName = desiredName.includes(".") ? desiredName : ensureFileExtension(desiredName, "md")
  const stem = fileName.replace(/\.[^.]+$/, "") || "untitled"
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1) : "md"

  let candidate = `${stem}.${extension}`
  let index = 1
  while (await pathExists(combinePaths(directory, candidate))) {
    candidate = `${stem}-${index}.${extension}`
    index += 1
    if (index > 999) {
      candidate = `${stem}-${Date.now()}.${extension}`
      break
    }
  }
  return candidate
}

export const isMarkdownFile = (value: string) => {
  const lower = value.toLowerCase()
  return lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx")
}

export const isTextFile = (value: string) => {
  const lower = value.toLowerCase()
  return (
    lower.endsWith(".txt") ||
    lower.endsWith(".ini") ||
    lower.endsWith(".log") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".env") ||
    lower.endsWith(".toml") ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".conf") ||
    lower.endsWith(".cfg") ||
    lower.endsWith(".properties")
  )
}
