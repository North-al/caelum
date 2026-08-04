import { useMemo, useState } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import { ZoomIn } from "lucide-react"

import { ImageLightbox } from "~/components/App/ImageLightbox"
import { Button } from "~/components/ui/button"
import { normalizePath } from "~/lib/workspace"

interface Props {
  path: string
  className?: string
}

export const ImagePreview = ({ path, className }: Props) => {
  const [lightbox, setLightbox] = useState(false)
  const src = useMemo(() => convertFileSrc(normalizePath(path)), [path])
  const name = path.split(/[\\/]/).pop() ?? path

  return (
    <>
      <div className={className ?? "flex h-full min-h-0 flex-col overflow-auto bg-background"}>
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/40 bg-muted/20 px-3">
          <div className="truncate text-[12px] text-muted-foreground">{name}</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground"
            onClick={() => setLightbox(true)}
          >
            <ZoomIn className="size-3.5" />
            放大预览
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
          <button
            type="button"
            className="max-h-full max-w-full cursor-zoom-in border-0 bg-transparent p-0"
            onClick={() => setLightbox(true)}
            title="点击放大预览"
          >
            <img
              src={src}
              alt={name}
              className="max-h-[min(80vh,720px)] max-w-full rounded-xl border border-border/40 object-contain shadow-sm"
            />
          </button>
        </div>
      </div>

      <ImageLightbox open={lightbox} src={src} alt={name} onClose={() => setLightbox(false)} />
    </>
  )
}
