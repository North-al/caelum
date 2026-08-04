/** In-app explorer clipboard (backup when OS CF_HDROP is unavailable). */

let memoryPaths: string[] = []

export const setExplorerClipboardPaths = (paths: string[]) => {
  memoryPaths = paths.map((path) => path.replace(/\\/g, "/")).filter(Boolean)
}

export const getExplorerClipboardPaths = () => [...memoryPaths]
