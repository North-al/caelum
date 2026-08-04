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

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"])

const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "ini"])

const CODE_EXTENSIONS = new Set(["json", "xml", "svg"])

/** Editable text/code files shown in the explorer and openable as tabs. */
const EDITABLE_EXTENSIONS = new Set([
  ...MARKDOWN_EXTENSIONS,
  ...PLAIN_TEXT_EXTENSIONS,
  "json",
  "xml",
  "svg",
])

/** All files listed in the file tree (editable + raster images). */
const TREE_VISIBLE_EXTENSIONS = new Set([...EDITABLE_EXTENSIONS, ...IMAGE_EXTENSIONS])

export const getFileExtension = (value: string) => {
  const name = value.split(/[\\/]/).pop() ?? value
  const index = name.lastIndexOf(".")
  if (index <= 0) {
    return ""
  }
  return name.slice(index + 1).toLowerCase()
}

export const isImagePath = (value: string) => IMAGE_EXTENSIONS.has(getFileExtension(value))

export const isMarkdownPath = (value: string) => MARKDOWN_EXTENSIONS.has(getFileExtension(value))

export const isPlainTextPath = (value: string) => PLAIN_TEXT_EXTENSIONS.has(getFileExtension(value))

export const isCodePath = (value: string) => CODE_EXTENSIONS.has(getFileExtension(value))

export const isEditablePath = (value: string) => EDITABLE_EXTENSIONS.has(getFileExtension(value))

export const isTreeVisiblePath = (value: string) => TREE_VISIBLE_EXTENSIONS.has(getFileExtension(value))

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
  if (CODE_EXTENSIONS.has(extension) || extension === "json" || extension === "xml") {
    return "code"
  }
  return "plain"
}

export const TREE_VISIBLE_EXTENSIONS_LIST = [...TREE_VISIBLE_EXTENSIONS]
export const EDITABLE_EXTENSIONS_LIST = [...EDITABLE_EXTENSIONS]
export { IMAGE_EXTENSIONS }
