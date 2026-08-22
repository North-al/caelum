/** Shared file-type helpers for the notes workspace. */

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif",
])

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"])

/** Plain / log-like text without structured highlighting requirement. */
const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "log", "csv"])

/**
 * Developer config + source text files (preview as code, edit as text).
 * Keep in sync with src-tauri `is_editable_text_extension`.
 */
const CODE_EXTENSIONS = new Set([
  // config / data
  "json",
  "jsonc",
  "json5",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "properties",
  "conf",
  "cfg",
  "config",
  // web
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "svg",
  "js",
  "mjs",
  "cjs",
  "ts",
  "jsx",
  "tsx",
  "vue",
  "svelte",
  // shell
  "sh",
  "bash",
  "zsh",
  "ps1",
  "bat",
  "cmd",
  // source (optional list)
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
])

/** Exact basenames (lowercase) treated as editable text even without/odd extensions. */
const SPECIAL_TEXT_NAMES = new Set([
  "dockerfile",
  "makefile",
  "gemfile",
  "procfile",
  ".env",
  ".gitignore",
  ".dockerignore",
  ".npmrc",
  ".nvmrc",
  ".editorconfig",
  ".eslintrc",
  ".prettierrc",
  ".babelrc",
])

/** Editable text/code files shown in the explorer and openable as tabs. */
const EDITABLE_EXTENSIONS = new Set([
  ...MARKDOWN_EXTENSIONS,
  ...PLAIN_TEXT_EXTENSIONS,
  ...CODE_EXTENSIONS,
])

/**
 * Files that can be opened via OS drag-drop into the workspace window.
 * Matches product-supported text formats (excludes raster images).
 */
const DROP_OPENABLE_EXTENSIONS = new Set([...EDITABLE_EXTENSIONS])

/** All files listed in the file tree (editable + raster images). */
const TREE_VISIBLE_EXTENSIONS = new Set([...EDITABLE_EXTENSIONS, ...IMAGE_EXTENSIONS])

export const getFileBasename = (value: string) => {
  const name = value.split(/[\\/]/).pop() ?? value
  return name
}

export const getFileExtension = (value: string) => {
  const name = getFileBasename(value)
  const index = name.lastIndexOf(".")
  // ".env" / ".gitignore" → no extension; "file.env" → "env"
  if (index <= 0) {
    return ""
  }
  return name.slice(index + 1).toLowerCase()
}

const isSpecialTextName = (value: string) => {
  const base = getFileBasename(value).toLowerCase()
  if (SPECIAL_TEXT_NAMES.has(base)) {
    return true
  }
  // .env.local / .env.production / .env.development
  if (base.startsWith(".env.")) {
    return true
  }
  return false
}

export const isImagePath = (value: string) => IMAGE_EXTENSIONS.has(getFileExtension(value))

export const isMarkdownPath = (value: string) => MARKDOWN_EXTENSIONS.has(getFileExtension(value))

export const isPlainTextPath = (value: string) => {
  if (isSpecialTextName(value)) {
    return true
  }
  return PLAIN_TEXT_EXTENSIONS.has(getFileExtension(value))
}

export const isCodePath = (value: string) => {
  if (isSpecialTextName(value)) {
    return true
  }
  const extension = getFileExtension(value)
  return CODE_EXTENSIONS.has(extension)
}

export const isEditablePath = (value: string) => {
  if (isSpecialTextName(value)) {
    return true
  }
  return EDITABLE_EXTENSIONS.has(getFileExtension(value))
}

/** Drag-drop openable notes / configs / source text. */
export const isDropOpenablePath = (value: string) => {
  if (isSpecialTextName(value)) {
    return true
  }
  return DROP_OPENABLE_EXTENSIONS.has(getFileExtension(value))
}

export const isTreeVisiblePath = (value: string) => {
  if (isSpecialTextName(value)) {
    return true
  }
  return TREE_VISIBLE_EXTENSIONS.has(getFileExtension(value))
}

/** Raster/binary images that should not be loaded via readTextFile. */
export const isBinaryImagePath = (value: string) => {
  const extension = getFileExtension(value)
  return IMAGE_EXTENSIONS.has(extension) && extension !== "svg"
}

export type PreviewKind = "markdown" | "plain" | "code" | "image" | "svg"

export const getPreviewKind = (path: string): PreviewKind => {
  const extension = getFileExtension(path)
  if (MARKDOWN_EXTENSIONS.has(extension)) {
    return "markdown"
  }
  if (extension === "svg") {
    return "svg"
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image"
  }
  if (isCodePath(path) || CODE_EXTENSIONS.has(extension)) {
    return "code"
  }
  if (PLAIN_TEXT_EXTENSIONS.has(extension) || isSpecialTextName(path)) {
    return isSpecialTextName(path) ? "code" : "plain"
  }
  return "plain"
}

/** Map extension / special name → highlight.js language id (null = no highlight). */
export const getHighlightLanguage = (path: string): string | null => {
  const base = getFileBasename(path).toLowerCase()
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "dockerfile"
  if (base === "makefile" || base.startsWith("makefile.")) return "makefile"
  if (base === ".gitignore" || base === ".dockerignore") return "plaintext"
  if (base === ".env" || base.startsWith(".env.") || base === ".npmrc" || base === ".nvmrc") {
    return "ini"
  }
  if (base === ".editorconfig") return "ini"
  if (base === ".eslintrc" || base === ".prettierrc" || base === ".babelrc") return "json"

  const extension = getFileExtension(path)
  const map: Record<string, string> = {
    json: "json",
    jsonc: "json",
    json5: "json",
    xml: "xml",
    svg: "xml",
    html: "xml",
    htm: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    ini: "ini",
    env: "ini",
    properties: "ini",
    conf: "ini",
    cfg: "ini",
    config: "ini",
    css: "css",
    scss: "scss",
    less: "less",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    vue: "xml",
    svelte: "xml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    ps1: "powershell",
    bat: "dos",
    cmd: "dos",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    kts: "kotlin",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    cs: "csharp",
    sql: "sql",
    graphql: "graphql",
    gql: "graphql",
    proto: "plaintext",
    md: "markdown",
    markdown: "markdown",
    mdx: "markdown",
    csv: "plaintext",
    log: "plaintext",
    txt: "plaintext",
  }
  return map[extension] ?? null
}

export const TREE_VISIBLE_EXTENSIONS_LIST = [...TREE_VISIBLE_EXTENSIONS].sort()
export const EDITABLE_EXTENSIONS_LIST = [...EDITABLE_EXTENSIONS].sort()
export const DROP_OPENABLE_EXTENSIONS_LIST = [...DROP_OPENABLE_EXTENSIONS].sort()
export const SUPPORTED_TEXT_EXTENSIONS_LIST = EDITABLE_EXTENSIONS_LIST
export { IMAGE_EXTENSIONS, SPECIAL_TEXT_NAMES, CODE_EXTENSIONS, MARKDOWN_EXTENSIONS }
