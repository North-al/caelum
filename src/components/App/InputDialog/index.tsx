import { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
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
  /** Optional extension picker for creating typed documents. */
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
  const [stem, setStem] = useState(stripExtension(defaultValue) || defaultValue)
  const [extension, setExtension] = useState(
    defaultExtension ?? extensionOptions?.[0]?.value ?? ""
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStem(stripExtension(defaultValue) || defaultValue)
      setExtension(defaultExtension ?? extensionOptions?.[0]?.value ?? "")
    }
  }, [defaultExtension, defaultValue, extensionOptions, open])

  const handleSubmit = async () => {
    const trimmedStem = stem.trim()
    if (!trimmedStem) {
      return
    }

    const nextValue =
      extensionOptions && extension
        ? trimmedStem.includes(".")
          ? trimmedStem
          : `${trimmedStem}.${extension.replace(/^\./, "")}`
        : trimmedStem

    setSubmitting(true)
    await onSubmit(nextValue)
    setSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={stem}
            placeholder={inputPlaceholder}
            onChange={(event) => setStem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSubmit()
              }
            }}
          />
          {extensionOptions && extensionOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {extensionOptions.map((option) => {
                const active = extension === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    onClick={() => setExtension(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
