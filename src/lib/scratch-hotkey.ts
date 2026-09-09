import { invoke } from "@tauri-apps/api/core"

/** Display form like Ctrl+Alt+N */
export const DEFAULT_SCRATCH_HOTKEY = "Ctrl+Alt+N"

export const setScratchHotkey = (shortcut: string) =>
  invoke<string>("set_scratch_hotkey", { shortcut })

export const getScratchHotkey = () => invoke<string>("get_scratch_hotkey")

export const splitHotkeyKeys = (hotkey: string) =>
  hotkey
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)

/** Build a display hotkey from a KeyboardEvent (ignores solo modifier presses). */
export const hotkeyFromKeyboardEvent = (event: KeyboardEvent): string | null => {
  const key = event.key
  if (!key || key === "Control" || key === "Alt" || key === "Shift" || key === "Meta") {
    return null
  }

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) {
    parts.push("Ctrl")
  }
  if (event.altKey) {
    parts.push("Alt")
  }
  if (event.shiftKey) {
    parts.push("Shift")
  }

  let label = key
  if (key === " ") {
    label = "Space"
  } else if (key.length === 1) {
    label = key.toUpperCase()
  } else if (key.startsWith("Arrow")) {
    label = key.replace("Arrow", "")
  }

  parts.push(label)
  if (parts.length < 2) {
    return null
  }
  return parts.join("+")
}
