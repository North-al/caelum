import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"

import type { FileNode } from "~/components/App/FileTree/types"
import type {
  AppPaths,
  ClipboardImagePayload,
  WorkspaceConfig,
  WorkspacePaths,
} from "~/lib/workspace-types"

/** Normalize a Tauri rejection into a human-friendly message without leaking raw internals. */
const describeInvokeError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message || fallback
  }
  if (typeof error === "string" && error.trim()) {
    return error
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage
    }
  }
  return fallback
}

export const initializeWorkspace = async (): Promise<WorkspaceConfig> =>
  invoke<WorkspaceConfig>("load_workspace_config")

export const getDefaultWorkspacePaths = async (): Promise<WorkspacePaths> =>
  invoke<WorkspacePaths>("get_default_workspace_paths")

export const getAppPaths = async (): Promise<AppPaths> => invoke<AppPaths>("get_app_paths")

export const saveWorkspaceConfig = async (config: WorkspaceConfig): Promise<WorkspaceConfig> => {
  try {
    return await invoke<WorkspaceConfig>("save_workspace_config", { config })
  } catch (error) {
    toast.error("配置保存失败", { description: describeInvokeError(error, "无法写入工作区配置") })
    // Swallow: callers fire-and-forget; surfacing rejections would surface
    // unhandled promises across the 11 void sites. UI state stays correct in memory.
    return config
  }
}

export const listNotesTree = async (notesPath: string): Promise<FileNode[]> =>
  invoke<FileNode[]>("list_notes_tree", { path: notesPath })

export const readTextFile = async (path: string): Promise<string> =>
  invoke<string>("read_text_file", { path })

export const writeTextFile = async (path: string, content: string): Promise<void> =>
  invoke<void>("write_text_file", { path, content })

export const createFileEntry = async (path: string): Promise<void> =>
  invoke<void>("create_file_entry", { path })

export const createFolderEntry = async (path: string): Promise<void> =>
  invoke<void>("create_folder_entry", { path })

export const renameEntry = async (oldPath: string, newPath: string): Promise<void> =>
  invoke<void>("rename_entry", { oldPath, newPath })

export const deleteEntry = async (path: string): Promise<void> =>
  invoke<void>("delete_entry", { path })

export const moveEntry = async (oldPath: string, newPath: string): Promise<void> =>
  invoke<void>("move_entry", { oldPath, newPath })

export const copyFileEntry = async (source: string, destinationDir: string): Promise<string> =>
  invoke<string>("copy_file_entry", { source, destinationDir })

export const copyFileToPath = async (source: string, destination: string): Promise<void> =>
  invoke<void>("copy_file_to_path", { source, destination })

export const writeBinaryFile = async (path: string, contents: Uint8Array | number[]): Promise<void> => {
  const bytes = contents instanceof Uint8Array ? contents : new Uint8Array(contents)
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...slice)
  }
  await invoke<void>("write_binary_file", {
    path,
    contentsBase64: btoa(binary),
  })
}

export const getClipboardFilePaths = async (): Promise<string[]> =>
  invoke<string[]>("get_clipboard_file_paths")

export const setClipboardFilePaths = async (paths: string[]): Promise<void> =>
  invoke<void>("set_clipboard_file_paths", { paths })

export const clipboardReadText = async (): Promise<string> => invoke<string>("clipboard_read_text")

export const clipboardWriteText = async (text: string): Promise<void> =>
  invoke<void>("clipboard_write_text", { text })

export const clipboardReadImage = async (): Promise<ClipboardImagePayload> =>
  invoke<ClipboardImagePayload>("clipboard_read_image")

export const clipboardWriteImage = async (image: ClipboardImagePayload): Promise<void> =>
  invoke<void>("clipboard_write_image", { image })

/** Prefer native Tauri clipboard; fall back to Web Clipboard API in browser preview. */
export const writeTextToClipboard = async (text: string): Promise<void> => {
  try {
    await clipboardWriteText(text)
  } catch (error) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
    throw error
  }
}

export const getLaunchFilePaths = async (): Promise<string[]> =>
  invoke<string[]>("get_launch_file_paths")
