import { convertFileSrc } from "@tauri-apps/api/core"

import { resolveAssetAbsolutePath } from "~/lib/assets"
import { normalizePath } from "~/lib/workspace"

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

  if (/^asset:/i.test(src)) {
    return src
  }

  const absolutePath = resolveAssetAbsolutePath(src, currentFilePath, workspaceRoot)
  if (!absolutePath || /^(https?:|data:|mailto:|#|asset:)/i.test(absolutePath)) {
    return absolutePath || src
  }

  return convertFileSrc(normalizePath(absolutePath))
}
