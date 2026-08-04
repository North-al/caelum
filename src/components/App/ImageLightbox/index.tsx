import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

interface Props {
  open: boolean
  src: string
  alt?: string
  onClose: () => void
}

/**
 * Naive UI–style fullscreen image preview: dark overlay, zoom/pan, no dialog chrome.
 */
export const ImageLightbox = ({ open, src, alt = "", onClose }: Props) => {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  )

  const reset = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    reset()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
      if (event.key === "+" || event.key === "=") {
        setScale((value) => Math.min(5, Number((value + 0.25).toFixed(2))))
      }
      if (event.key === "-") {
        setScale((value) => Math.max(0.25, Number((value - 0.25).toFixed(2))))
      }
      if (event.key === "0") {
        reset()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose, reset])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/84"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "图片预览"}
      onClick={onClose}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none max-w-[50%] truncate text-sm text-white/75">{alt || "图片预览"}</div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/45 p-1 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-white hover:bg-white/15 hover:text-white"
            onClick={() => setScale((value) => Math.max(0.25, Number((value - 0.25).toFixed(2))))}
            aria-label="缩小"
          >
            <ZoomOut className="size-4" />
          </Button>
          <div className="min-w-12 px-1 text-center text-xs tabular-nums text-white/80">{Math.round(scale * 100)}%</div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-white hover:bg-white/15 hover:text-white"
            onClick={() => setScale((value) => Math.min(5, Number((value + 0.25).toFixed(2))))}
            aria-label="放大"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-white hover:bg-white/15 hover:text-white"
            onClick={reset}
            aria-label="重置"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-white hover:bg-white/15 hover:text-white"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center overflow-hidden",
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-out"
        )}
        onWheel={(event) => {
          event.preventDefault()
          const delta = event.deltaY < 0 ? 0.12 : -0.12
          setScale((value) => Math.min(5, Math.max(0.25, Number((value + delta).toFixed(2)))))
        }}
        onPointerDown={(event) => {
          if (scale <= 1) {
            return
          }
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = {
            active: true,
            startX: event.clientX,
            startY: event.clientY,
            originX: offset.x,
            originY: offset.y,
          }
        }}
        onPointerMove={(event) => {
          const session = dragRef.current
          if (!session?.active) {
            return
          }
          setOffset({
            x: session.originX + (event.clientX - session.startX),
            y: session.originY + (event.clientY - session.startY),
          })
        }}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (scale <= 1) {
            onClose()
          }
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[92vh] max-w-[92vw] select-none object-contain transition-transform duration-100 will-change-transform"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        />
      </div>
    </div>,
    document.body
  )
}
