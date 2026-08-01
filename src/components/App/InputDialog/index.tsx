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

interface Props {
  open: boolean
  title: string
  description?: string
  defaultValue?: string
  inputPlaceholder?: string
  confirmLabel?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: string) => Promise<void> | void
}

export const InputDialog = ({
  open,
  title,
  description,
  defaultValue = "",
  inputPlaceholder,
  confirmLabel = "确定",
  onOpenChange,
  onSubmit,
}: Props) => {
  const [value, setValue] = useState(defaultValue)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
    }
  }, [defaultValue, open])

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    setSubmitting(true)
    await onSubmit(trimmed)
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
        <Input
          autoFocus
          value={value}
          placeholder={inputPlaceholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleSubmit()
            }
          }}
        />
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
