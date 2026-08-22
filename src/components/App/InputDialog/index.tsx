import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  joinFileName,
} from "~/lib/rename"
import { cn } from "~/lib/utils"

interface ExtensionOption {
  label: string
  value: string
}

interface Props {
  open: boolean
  title: string
  description?: string
  defaultValue?: string
  inputPlaceholder?: string
  confirmLabel?: string
  /** When set, shows rename-style stem + extension picker. */
  extensionOptions?: ExtensionOption[]
  defaultExtension?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: string) => Promise<void> | void
}

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, "")

export const InputDialog = ({
  open,
  title,
  description,
  defaultValue = "",
  inputPlaceholder,
  confirmLabel = "确定",
  extensionOptions,
  defaultExtension,
  onOpenChange,
  onSubmit,
}: Props) => {
  const withExtension = Boolean(extensionOptions && extensionOptions.length > 0)
  const [stem, setStem] = useState(stripExtension(defaultValue) || defaultValue)
  const [extension, setExtension] = useState(
    (defaultExtension ?? extensionOptions?.[0]?.value ?? "").replace(/^\./, "")
  )
  const [submitting, setSubmitting] = useState(false)
  const stemRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setStem(stripExtension(defaultValue) || defaultValue)
    setExtension((defaultExtension ?? extensionOptions?.[0]?.value ?? "").replace(/^\./, ""))
    const timer = window.setTimeout(() => {
      const input = stemRef.current
      if (!input) {
        return
      }
      input.focus()
      input.setSelectionRange(0, input.value.length)
    }, 30)
    return () => window.clearTimeout(timer)
  }, [defaultExtension, defaultValue, extensionOptions, open])

  const illegal =
    hasIllegalFilenameChars(stem) || (withExtension && hasIllegalFilenameChars(extension))
  const empty = !stem.trim()

  const handleSubmit = async () => {
    if (empty || illegal || submitting) {
      return
    }

    const trimmedStem = stem.trim()
    const nextValue = withExtension
      ? trimmedStem.includes(".")
        ? trimmedStem
        : joinFileName(trimmedStem, extension)
      : trimmedStem

    setSubmitting(true)
    try {
      await onSubmit(nextValue)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-4 sm:max-w-[380px]">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-[15px]">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2">
          <div
            className={cn(
              "flex items-stretch overflow-hidden rounded-xl border bg-background transition-colors",
              illegal
                ? "border-destructive/50 ring-1 ring-destructive/20"
                : "border-border/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
            )}
          >
            <input
              ref={stemRef}
              value={stem}
              aria-label="文件名"
              placeholder={inputPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] outline-none"
              onChange={(event) => setStem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSubmit()
                }
                if (event.key === "Escape") {
                  onOpenChange(false)
                }
              }}
            />
            {withExtension ? (
              <>
                <span className="flex items-center bg-muted/40 px-1 text-[13px] text-muted-foreground">.</span>
                <input
                  value={extension}
                  aria-label="后缀"
                  className="w-[3.75rem] bg-muted/25 px-1.5 py-2.5 text-[13px] text-muted-foreground outline-none"
                  onChange={(event) => setExtension(event.target.value.replace(/^\./, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSubmit()
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
                    <ExtensionGroupMenu
                      current={extension}
                      onSelect={(next) => setExtension(next)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>
          {illegal ? <p className="text-[12px] text-destructive">{illegalFilenameMessage}</p> : null}
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
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg px-3 text-[12px]"
            disabled={empty || illegal || submitting}
            onClick={() => void handleSubmit()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
