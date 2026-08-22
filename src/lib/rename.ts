/** Filename validation and wiki-link helpers for rename flows. */

import { EDITABLE_EXTENSIONS_LIST } from "~/lib/file-types"

const ILLEGAL_CHARS = /[\\/:*?"<>|]/

export const SUPPORTED_RENAME_EXTENSIONS = EDITABLE_EXTENSIONS_LIST

export type SupportedRenameExtension = (typeof SUPPORTED_RENAME_EXTENSIONS)[number]

/** Grouped extension picker for create / rename dialogs. */
export const EXTENSION_GROUPS: Array<{ id: string; label: string; extensions: string[] }> = [
  {
    id: "docs",
    label: "文档",
    extensions: ["md", "markdown", "mdx", "txt", "log", "csv"],
  },
  {
    id: "config",
    label: "配置",
    extensions: [
      "json",
      "jsonc",
      "json5",
      "yaml",
      "yml",
      "toml",
      "ini",
      "env",
      "properties",
      "conf",
      "cfg",
      "config",
      "xml",
    ],
  },
  {
    id: "web",
    label: "Web",
    extensions: [
      "html",
      "htm",
      "css",
      "scss",
      "less",
      "js",
      "mjs",
      "cjs",
      "ts",
      "jsx",
      "tsx",
      "vue",
      "svelte",
      "svg",
    ],
  },
  {
    id: "source",
    label: "源码",
    extensions: [
      "py",
      "go",
      "rs",
      "java",
      "kt",
      "kts",
      "c",
      "h",
      "cpp",
      "cc",
      "cxx",
      "hpp",
      "cs",
      "sql",
      "graphql",
      "gql",
      "proto",
    ],
  },
  {
    id: "shell",
    label: "脚本",
    extensions: ["sh", "bash", "zsh", "ps1", "bat", "cmd"],
  },
]

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
