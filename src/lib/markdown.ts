import { convertFileSrc } from "@tauri-apps/api/core"

import { combinePaths, normalizePath } from "~/lib/workspace"

export const resolveMarkdownAssetUrl = (
  src: string,
  currentFilePath: string,
  workspaceRoot: string
) => {
  if (!src) {
    return src
  }

  if (/^(https?:|data:|mailto:|#)/i.test(src)) {
    return src
  }

  if (src.startsWith("/")) {
    return convertFileSrc(src)
  }

  if (/^[A-Za-z]:[\\/]/.test(src)) {
    return convertFileSrc(normalizePath(src))
  }

  const currentDirectory = currentFilePath.includes("/")
    ? currentFilePath.slice(0, currentFilePath.lastIndexOf("/"))
    : ""

  const candidatePaths = [
    combinePaths(currentDirectory, src),
    combinePaths(workspaceRoot, src),
  ]

  const existingPath = candidatePaths.find((value) => value)
  if (!existingPath) {
    return convertFileSrc(combinePaths(workspaceRoot, src))
  }

  return convertFileSrc(existingPath)
}
