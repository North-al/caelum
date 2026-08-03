import {
  combinePaths,
  copyFileToPath,
  getParentPath,
  normalizePath,
  resolveJoinedPath,
  writeBinaryFile,
} from "~/lib/workspace"

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"])

export const isImagePath = (value: string) => {
  const extension = value.split(".").pop()?.toLowerCase() ?? ""
  return IMAGE_EXTENSIONS.has(extension)
}

export const extensionFromMime = (mime: string) => {
  const normalized = mime.toLowerCase()
  if (normalized.includes("png")) return "png"
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg"
  if (normalized.includes("gif")) return "gif"
  if (normalized.includes("webp")) return "webp"
  if (normalized.includes("svg")) return "svg"
  if (normalized.includes("bmp")) return "bmp"
  if (normalized.includes("avif")) return "avif"
  return "png"
}

export const extensionFromPath = (value: string) => {
  const extension = value.split(".").pop()?.toLowerCase() ?? ""
  return IMAGE_EXTENSIONS.has(extension) ? extension : "png"
}

const buildAssetRelativeKey = (extension: string) => {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const id = crypto.randomUUID().replace(/-/g, "")
  return `${year}/${month}/${id}.${extension.replace(/^\./, "")}`
}

export const toRelativePath = (fromFilePath: string, toFilePath: string) => {
  const fromDir = getParentPath(fromFilePath)
  const fromParts = normalizePath(fromDir).split("/").filter(Boolean)
  const toParts = normalizePath(toFilePath).split("/").filter(Boolean)

  let common = 0
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common].toLowerCase() === toParts[common].toLowerCase()
  ) {
    common += 1
  }

  const ups = fromParts.length - common
  const downs = toParts.slice(common)
  const relative = [...Array.from({ length: ups }, () => ".."), ...downs].join("/")
  return relative || "."
}

export const markdownImageSyntax = (relativePath: string, alt = "") =>
  `![${alt}](${relativePath.replace(/\\/g, "/")})`

export const importImageBytes = async (options: {
  assetsPath: string
  bytes: Uint8Array
  extension: string
}): Promise<string> => {
  const relativeKey = buildAssetRelativeKey(options.extension)
  const absolutePath = combinePaths(options.assetsPath, relativeKey)
  await writeBinaryFile(absolutePath, Array.from(options.bytes))
  return normalizePath(absolutePath)
}

export const importImageFromPath = async (options: {
  assetsPath: string
  sourcePath: string
}): Promise<string> => {
  const extension = extensionFromPath(options.sourcePath)
  const relativeKey = buildAssetRelativeKey(extension)
  const absolutePath = combinePaths(options.assetsPath, relativeKey)
  await copyFileToPath(options.sourcePath, absolutePath)
  return normalizePath(absolutePath)
}

export const buildImageMarkdown = (options: {
  markdownFilePath: string
  assetAbsolutePath: string
  alt?: string
}) => {
  const relative = toRelativePath(options.markdownFilePath, options.assetAbsolutePath)
  return markdownImageSyntax(relative, options.alt ?? "")
}

export const resolveAssetAbsolutePath = (
  src: string,
  currentFilePath: string,
  workspaceRoot: string
) => {
  if (!src) {
    return ""
  }

  if (/^(https?:|data:|mailto:|#|asset:)/i.test(src)) {
    return src
  }

  if (/^[A-Za-z]:[\\/]/.test(src) || src.startsWith("/")) {
    return normalizePath(src)
  }

  const currentDirectory = getParentPath(currentFilePath)
  if (currentDirectory) {
    return resolveJoinedPath(currentDirectory, src)
  }

  return resolveJoinedPath(workspaceRoot, src)
}
