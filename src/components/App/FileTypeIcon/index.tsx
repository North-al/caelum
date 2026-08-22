import { Braces, Code2, FileCode2, FileText, ImageIcon, Terminal } from "lucide-react"
import { convertFileSrc } from "@tauri-apps/api/core"

import {
  getFileBasename,
  getFileExtension,
  isBinaryImagePath,
  isImagePath,
  isMarkdownPath,
} from "~/lib/file-types"
import { normalizePath } from "~/lib/workspace"
import { cn } from "~/lib/utils"

interface FileTypeIconProps {
  path: string
  className?: string
  /** Show raster thumbnails for image paths (explorer only). */
  showThumbnail?: boolean
}

/** Shared format glyph used by explorer rows and tab labels. */
export const FileTypeIcon = ({ path, className, showThumbnail = false }: FileTypeIconProps) => {
  const extension = getFileExtension(path)
  const base = getFileBasename(path).toLowerCase()
  const iconClass = cn("size-3.5 shrink-0", className)

  if (isImagePath(path)) {
    if (showThumbnail && (isBinaryImagePath(path) || extension === "svg")) {
      return (
        <img
          src={convertFileSrc(normalizePath(path))}
          alt=""
          className={cn("size-3.5 shrink-0 rounded-[3px] object-cover ring-1 ring-border/50", className)}
          loading="lazy"
        />
      )
    }
    return <ImageIcon className={cn(iconClass, "text-emerald-500/90")} strokeWidth={1.75} />
  }

  if (isMarkdownPath(path)) {
    return <FileText className={cn(iconClass, "text-primary/75")} strokeWidth={1.75} />
  }

  if (
    extension === "json" ||
    extension === "jsonc" ||
    extension === "json5" ||
    base === ".eslintrc" ||
    base === ".prettierrc" ||
    base === ".babelrc"
  ) {
    return <Braces className={cn(iconClass, "text-amber-500/90")} strokeWidth={1.75} />
  }

  if (
    extension === "xml" ||
    extension === "svg" ||
    extension === "html" ||
    extension === "htm" ||
    extension === "vue" ||
    extension === "svelte"
  ) {
    return <Code2 className={cn(iconClass, "text-sky-500/90")} strokeWidth={1.75} />
  }

  if (
    extension === "sh" ||
    extension === "bash" ||
    extension === "zsh" ||
    extension === "ps1" ||
    extension === "bat" ||
    extension === "cmd" ||
    base === "dockerfile" ||
    base === "makefile"
  ) {
    return <Terminal className={cn(iconClass, "text-lime-600/90 dark:text-lime-400/90")} strokeWidth={1.75} />
  }

  if (
    extension === "ini" ||
    extension === "env" ||
    extension === "toml" ||
    extension === "yaml" ||
    extension === "yml" ||
    extension === "properties" ||
    extension === "conf" ||
    extension === "cfg" ||
    extension === "config" ||
    base === ".env" ||
    base.startsWith(".env.") ||
    base === ".editorconfig" ||
    base === ".npmrc" ||
    base === ".nvmrc" ||
    base === ".gitignore" ||
    base === ".dockerignore"
  ) {
    return <FileCode2 className={cn(iconClass, "text-violet-500/90")} strokeWidth={1.75} />
  }

  if (extension === "txt" || extension === "log" || extension === "csv") {
    return <FileText className={cn(iconClass, "text-muted-foreground")} strokeWidth={1.75} />
  }

  return <FileCode2 className={cn(iconClass, "text-muted-foreground")} strokeWidth={1.75} />
}
