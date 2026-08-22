import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { ExtensionGroupMenu } from "~/components/App/ExtensionGroupMenu"
import {
  hasIllegalFilenameChars,
  illegalFilenameMessage,
  isSupportedExtension,
  joinFileName,
  splitFileName,
} from "~/lib/rename"
import { cn } from "~/lib/utils"

interface RenameDialogProps {
  open: boolean
  path: string | null
  isFolder?: boolean
  confirmInvalidExtension?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (nextName: string) => Promise<void> | void
}

export const RenameDialog = ({
  open,
  path,
  isFolder = false,
  confirmInvalidExtension = true,
  onOpenChange,
  onSubmit,
}: RenameDialogProps) => {
  const fileName = path ? (path.split(/[\\/]/).pop() ?? path) : ""
  const initial = splitFileName(fileName)

  const [stem, setStem] = useState(initial.stem)
  const [extension, setExtension] = useState(initial.extension)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const stemRef = useRef<HTMLInputElement>(null)
  const extRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false)
      return
    }
    const next = splitFileName(fileName)
    setStem(next.stem)
    setExtension(isFolder ? "" : next.extension)
    const timer = window.setTimeout(() => {
      const input = stemRef.current
      if (!input) {
        return
      }
      input.focus()
      input.setSelectionRange(0, input.value.length)
    }, 30)
    return () => window.clearTimeout(timer)
  }, [fileName, isFolder, open])

  const composed = useMemo(
    () => (isFolder ? stem.trim() : joinFileName(stem, extension)),
    [extension, isFolder, stem]
  )

  const illegal =
    hasIllegalFilenameChars(stem) || (!isFolder && hasIllegalFilenameChars(extension))
  const empty = !stem.trim()
  const canSave = !illegal && !empty && !submitting

  const supported = isFolder || isSupportedExtension(extension)
  const extensionChanged =
    !isFolder && extension.trim().replace(/^\./, "").toLowerCase() !== initial.extension
  const showGreenTip = !isFolder && supported && extensionChanged && Boolean(extension.trim())
  const showOrangeTip = !isFolder && !supported

  const commit = async () => {
    if (!canSave) {
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(composed)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  const handleSaveClick = () => {
    if (!canSave) {
      return
    }
    if (!isFolder && !supported && confirmInvalidExtension) {
      setConfirmOpen(true)
      return
    }
    void commit()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConfirmOpen(false)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="w-[min(92vw,380px)] rounded-xl p-4"
        overlayClassName="bg-black/30 backdrop-blur-none"
        showCloseButton={false}
      >
        <DialogHeader className="mb-3">
          <DialogTitle className="text-[15px]">{isFolder ? "重命名文件夹" : "重命名"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div
            className={cn(
              "flex items-stretch overflow-hidden rounded-xl border bg-background transition-colors",
              illegal
                ? "border-destructive/50 ring-1 ring-destructive/20"
                : showOrangeTip
                  ? "border-amber-400/50"
                  : "border-border/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
            )}
          >
            <input
              ref={stemRef}
              value={stem}
              aria-label="文件名"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] outline-none"
              onChange={(event) => setStem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleSaveClick()
                }
                if (event.key === "Escape") {
                  onOpenChange(false)
                }
              }}
            />
            {!isFolder ? (
              <>
                <span className="flex items-center bg-muted/40 px-1 text-[13px] text-muted-foreground">.</span>
                <input
                  ref={extRef}
                  value={extension}
                  aria-label="后缀"
                  className="w-[3.75rem] bg-muted/25 px-1.5 py-2.5 text-[13px] text-muted-foreground outline-none"
                  onChange={(event) => setExtension(event.target.value.replace(/^\./, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleSaveClick()
                    }
                    if (event.key === "Escape") {
                      onOpenChange(false)
                    }
                  }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 border-l border-border/50 bg-muted/30 px-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        aria-label="选择后缀"
                      />
                    }
                  >
                    <ChevronDown className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" className="min-w-[8.5rem]">
                    <ExtensionGroupMenu current={extension} onSelect={setExtension} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>

          {illegal ? (
            <p className="text-[12px] text-destructive">{illegalFilenameMessage}</p>
          ) : null}
          {showGreenTip ? (
            <p className="text-[12px] text-emerald-600 dark:text-emerald-400">
              保存后将自动切换语法高亮
            </p>
          ) : null}
          {showOrangeTip ? (
            <p className="text-[12px] text-amber-600 dark:text-amber-400">
              当前后缀不受支持，仍可保存为普通文本
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-4 items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg bg-muted/60 px-3 text-[12px] text-muted-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <div className="relative">
            <Button
              type="button"
              size="sm"
              className={cn(
                "h-8 rounded-lg px-3 text-[12px]",
                showOrangeTip && "ring-1 ring-amber-400/60"
              )}
              disabled={!canSave}
              onClick={handleSaveClick}
            >
              保存
            </Button>

            {confirmOpen ? (
              <div className="absolute bottom-[calc(100%+8px)] right-0 z-10 w-56 rounded-xl border border-border/60 bg-popover p-3 text-left shadow-lg animate-in fade-in-0 duration-200">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  后缀不受支持，确定仍要保存为「{composed}」吗？
                </p>
                <div className="mt-2.5 flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-[11px]"
                    onClick={() => setConfirmOpen(false)}
                  >
                    再想想
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-[11px]"
                    onClick={() => void commit()}
                  >
                    仍要保存
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
