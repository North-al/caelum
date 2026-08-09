import { Braces, Code2, FileCode2, FileText, ImageIcon } from "lucide-react"
import { convertFileSrc } from "@tauri-apps/api/core"

import { getFileExtension, isBinaryImagePath, isImagePath } from "~/lib/file-types"
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
  if (extension === "json") {
    return <Braces className={cn(iconClass, "text-amber-500/90")} strokeWidth={1.75} />
  }
  if (extension === "xml" || extension === "svg") {
    return <Code2 className={cn(iconClass, "text-sky-500/90")} strokeWidth={1.75} />
  }
  if (extension === "ini") {
    return <FileCode2 className={cn(iconClass, "text-violet-500/90")} strokeWidth={1.75} />
  }
  if (extension === "txt") {
    return <FileText className={cn(iconClass, "text-muted-foreground")} strokeWidth={1.75} />
  }
  return <FileText className={cn(iconClass, "text-primary/75")} strokeWidth={1.75} />
}
