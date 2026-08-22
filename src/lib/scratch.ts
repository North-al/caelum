import { invoke } from "@tauri-apps/api/core"

import type { ScratchAppearance } from "~/lib/scratch-appearance"

export const SCRATCH_COLORS = ["ivory", "fog", "sage", "blush", "lemon"] as const
export type ScratchColor = (typeof SCRATCH_COLORS)[number]

export type ScratchStatus = "inbox" | "pinned" | "archived"

export type ScratchFilter = "active" | "inbox" | "pinned" | "archived"

export type ScratchEditorMode = "todo" | "memo"

export interface ScratchNote {
  id: string
  content: string
  status: ScratchStatus
  color: ScratchColor
  appearance?: ScratchAppearance
  editorMode?: ScratchEditorMode
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  alwaysOnTop: boolean
  createdAt: number
  updatedAt: number
  windowX: number | null
  windowY: number | null
  windowWidth: number | null
  windowHeight: number | null
}

export interface ScratchStorePayload {
  lastActiveId: string | null
  nextZ: number
  notes: ScratchNote[]
}

export const SCRATCH_COLOR_LABELS: Record<ScratchColor, string> = {
  ivory: "米白",
  fog: "雾蓝",
  sage: "鼠尾草",
  blush: "浅粉",
  lemon: "浅黄",
}

export const SCRATCH_STATUS_LABELS: Record<ScratchStatus, string> = {
  inbox: "待整理",
  pinned: "常驻",
  archived: "归档",
}

export const paperTilt = (id: string) => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0
  }
  return ((Math.abs(hash) % 23) - 11) * 0.18
}

export const scratchPreview = (content: string) => {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const first = lines.find((line) => line.trim()) ?? ""
  const title = first.replace(/^#+\s*/, "").trim()
  const body = lines
    .filter((line) => line !== first)
    .join("\n")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>#-]/g, "")
    .trim()

  return {
    title: title || "空白纸条",
    body,
    empty: !content.trim(),
  }
}

export const filenameFromScratch = (content: string) => {
  const line = content
    .split("\n")
    .map((item) => item.trim())
    .find(Boolean) ?? ""
  const title = line
    .replace(/^#+\s*/, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .slice(0, 40)

  if (title) {
    return `${title}.md`
  }

  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `便签 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`
}

export const resolveEditorMode = (note: Pick<ScratchNote, "content" | "editorMode">): ScratchEditorMode => {
  if (note.editorMode === "memo" || note.editorMode === "todo") {
    return note.editorMode
  }
  const trimmed = note.content.trim()
  if (!trimmed) {
    return "todo"
  }
  if (/^-\s*\[[ xX]\]/m.test(trimmed)) {
    return "todo"
  }
  if (trimmed.includes("\n")) {
    return "memo"
  }
  return "todo"
}

export const matchesScratchFilter = (note: ScratchNote, filter: ScratchFilter) => {
  if (filter === "active") {
    return note.status !== "archived"
  }
  return note.status === filter
}

export const loadScratchStore = () => invoke<ScratchStorePayload>("load_scratch_store")

export const upsertScratchNote = (note: ScratchNote) =>
  invoke<ScratchStorePayload>("upsert_scratch_note", { note })

export const patchScratchNote = (patch: { id: string } & Partial<ScratchNote>) =>
  invoke<ScratchStorePayload>("patch_scratch_note", { patch })

export const createScratchNote = (position?: { x?: number; y?: number }) =>
  invoke<ScratchNote>("create_scratch_note", {
    x: position?.x ?? null,
    y: position?.y ?? null,
  })

export const deleteScratchNote = (id: string) =>
  invoke<ScratchStorePayload>("delete_scratch_note", { id })

export const openScratchWindow = (id: string) => invoke<void>("open_scratch_window", { id })

export const closeScratchWindow = (id: string) => invoke<void>("close_scratch_window", { id })

export const dismissScratchWindow = () => invoke<void>("dismiss_scratch_window")

export const destroyScratchWindow = () => invoke<void>("destroy_scratch_window")

export const toggleScratchCapture = () => invoke<void>("toggle_scratch_capture_cmd")
