import { listen } from "@tauri-apps/api/event"
import { toast } from "sonner"
import { create } from "zustand"

import {
  createScratchNote,
  deleteScratchNote,
  loadScratchStore,
  openScratchWindow,
  toggleScratchCapture,
  patchScratchNote,
  upsertScratchNote,
  type ScratchNote,
  type ScratchStorePayload,
} from "~/lib/scratch"
import { withResolvedAppearance } from "~/lib/scratch-appearance"

interface ScratchState {
  notes: ScratchNote[]
  lastActiveId: string | null
  loaded: boolean
  load: () => Promise<void>
  hydrate: (payload: ScratchStorePayload) => void
  upsert: (note: ScratchNote) => Promise<void>
  patch: (id: string, next: Partial<ScratchNote>) => Promise<ScratchNote | null>
  remove: (id: string) => Promise<void>
  create: (options?: { x?: number; y?: number; open?: boolean }) => Promise<ScratchNote | null>
  openWindow: (id: string) => Promise<void>
  toggleCapture: () => Promise<void>
}

const applyPayload = (payload: ScratchStorePayload) => ({
  notes: (payload.notes ?? []).map(withResolvedAppearance),
  lastActiveId: payload.lastActiveId ?? null,
  loaded: true,
})

let listening = false

const ensureListener = async () => {
  if (listening) {
    return
  }
  listening = true
  try {
    await listen<ScratchStorePayload>("scratch-changed", (event) => {
      if (event.payload) {
        useScratchStore.getState().hydrate(event.payload)
      }
    })
  } catch {
    listening = false
  }
}

export const useScratchStore = create<ScratchState>((set, get) => ({
  notes: [],
  lastActiveId: null,
  loaded: false,

  hydrate: (payload) => {
    set(applyPayload(payload))
  },

  load: async () => {
    await ensureListener()
    try {
      const payload = await loadScratchStore()
      set(applyPayload(payload))
    } catch (error) {
      set({ loaded: true })
      toast.error("无法读取便签", {
        description: error instanceof Error ? error.message : "快捷便签存储不可用",
      })
    }
  },

  upsert: async (note) => {
    try {
      const payload = await upsertScratchNote({
        ...note,
        updatedAt: Date.now(),
      })
      set(applyPayload(payload))
    } catch (error) {
      toast.error("便签保存失败", {
        description: error instanceof Error ? error.message : "无法写入本地便签",
      })
    }
  },

  patch: async (id, next) => {
    const current = get().notes.find((note) => note.id === id)
    if (!current) {
      return null
    }
    try {
      const payload = await patchScratchNote({ id, ...next })
      set(applyPayload(payload))
      return get().notes.find((note) => note.id === id) ?? { ...current, ...next }
    } catch (error) {
      toast.error("便签保存失败", {
        description: error instanceof Error ? error.message : "无法写入本地便签",
      })
      return null
    }
  },

  remove: async (id) => {
    try {
      const payload = await deleteScratchNote(id)
      set(applyPayload(payload))
    } catch (error) {
      toast.error("无法删除便签", {
        description: error instanceof Error ? error.message : "删除失败",
      })
    }
  },

  create: async (options) => {
    try {
      const note = withResolvedAppearance(
        await createScratchNote({
          x: options?.x,
          y: options?.y,
        })
      )
      set((state) => ({
        notes: [...state.notes.filter((item) => item.id !== note.id), note],
        lastActiveId: note.id,
        loaded: true,
      }))
      if (options?.open !== false) {
        await openScratchWindow(note.id)
      }
      return note
    } catch (error) {
      toast.error("无法创建便签", {
        description: error instanceof Error ? error.message : "创建失败",
      })
      return null
    }
  },

  openWindow: async (id) => {
    try {
      await openScratchWindow(id)
    } catch (error) {
      toast.error("无法打开便签", {
        description: error instanceof Error ? error.message : "窗口打开失败",
      })
    }
  },

  toggleCapture: async () => {
    try {
      await toggleScratchCapture()
    } catch (error) {
      toast.error("无法唤起便签", {
        description: error instanceof Error ? error.message : "全局快捷键窗口不可用",
      })
    }
  },
}))
