import {
  allocateUniqueFileName,
  combinePaths,
  createFileEntry,
  writeTextFile,
} from "~/lib/workspace"
import { filenameFromScratch, type ScratchNote } from "~/lib/scratch"
import { useScratchStore } from "~/store/scratch"
import { useWorkspaceStore } from "~/store/workspace"
import { emit } from "@tauri-apps/api/event"

export const promoteScratchToNote = async (note: ScratchNote) => {
  const content = note.content.trim()
  if (!content) {
    throw new Error("空白纸条无法转入笔记")
  }

  const notesPath = useWorkspaceStore.getState().config?.notesPath
  if (!notesPath) {
    throw new Error("工作区尚未就绪")
  }

  const fileName = await allocateUniqueFileName(notesPath, filenameFromScratch(note.content))
  const path = combinePaths(notesPath, fileName)
  await createFileEntry(path)
  await writeTextFile(path, note.content.endsWith("\n") ? note.content : `${note.content}\n`)
  await useScratchStore.getState().patch(note.id, { status: "archived" })

  try {
    await emit("scratch-promoted", path)
  } catch {
    await useWorkspaceStore.getState().refreshTree()
    await useWorkspaceStore.getState().selectFile(path)
  }

  return { path, fileName }
}
