/** Same-document tab drag state for explorer copy (WebView2-safe). */
let activeTabDragPath: string | null = null
let activeDropDir: string | null = null
const listeners = new Set<() => void>()

const notify = () => {
  for (const listener of listeners) {
    listener()
  }
}

export const subscribeTabDrag = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const beginTabDrag = (filePath: string) => {
  activeTabDragPath = filePath.replace(/\\/g, "/")
  notify()
}

export const endTabDrag = () => {
  activeTabDragPath = null
  activeDropDir = null
  notify()
}

export const getActiveTabDragPath = () => activeTabDragPath

export const setActiveDropDir = (dir: string | null) => {
  const next = dir?.replace(/\\/g, "/") ?? null
  if (activeDropDir === next) {
    return
  }
  activeDropDir = next
  notify()
}

export const getActiveDropDir = () => activeDropDir

export const DROP_DIR_ATTR = "data-caelum-drop-dir"
export const EXPLORER_ZONE_ATTR = "data-caelum-drop-zone"

export const findDropDirFromPoint = (clientX: number, clientY: number) => {
  const element = document.elementFromPoint(clientX, clientY)
  if (!element) {
    return null
  }
  const target = element.closest(`[${DROP_DIR_ATTR}]`) as HTMLElement | null
  return target?.getAttribute(DROP_DIR_ATTR) ?? null
}

export const isPointInExplorerZone = (clientX: number, clientY: number) => {
  const element = document.elementFromPoint(clientX, clientY)
  if (!element) {
    return false
  }
  return Boolean(element.closest(`[${EXPLORER_ZONE_ATTR}="explorer"]`))
}
