import { tryFormatByExtension } from "~/lib/format-code"
import { getFileExtension } from "~/lib/file-types"
import { readTextFile, writeTextFile } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

const FORMATABLE = new Set(["md", "markdown", "mdx", "json", "jsonc", "xml", "svg", "ini", "html", "htm"])

export const canFormatPath = (path: string) => FORMATABLE.has(getFileExtension(path).toLowerCase())

/** Format a file in the editor buffer when open, otherwise rewrite on disk. */
export const formatDocumentAtPath = async (path: string) => {
  const extension = getFileExtension(path).toLowerCase()
  if (!FORMATABLE.has(extension)) {
    throw new Error("当前文件类型不支持格式化")
  }

  const state = useWorkspaceStore.getState()
  let content: string
  if (state.selectedFilePath === path) {
    content = state.currentContent
  } else if (state.fileDrafts[path] !== undefined) {
    content = state.fileDrafts[path]
  } else {
    content = await readTextFile(path)
  }

  const formatted = tryFormatByExtension(extension, content)
  if (formatted == null) {
    throw new Error("请检查语法是否正确")
  }
  if (formatted === content) {
    return { changed: false as const }
  }

  if (state.selectedFilePath === path) {
    state.updateContent(formatted)
    return { changed: true as const }
  }

  if (state.openFiles.includes(path)) {
    useWorkspaceStore.setState({
      fileDrafts: { ...state.fileDrafts, [path]: formatted },
      dirtyFiles: { ...state.dirtyFiles, [path]: true },
    })
    return { changed: true as const }
  }

  await writeTextFile(path, formatted)
  return { changed: true as const }
}
