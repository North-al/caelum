import { useEffect, useState } from "react"

import { Input } from "~/components/ui/input"
import { cn } from "~/lib/utils"

interface NumberFieldProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  id?: string
  /** Fallback when the field is empty / invalid on commit */
  fallback?: number
}

const clamp = (value: number, min?: number, max?: number) => {
  let next = value
  if (min != null) next = Math.max(min, next)
  if (max != null) next = Math.min(max, next)
  return next
}

/** Draft-friendly numeric input — avoids sticky leading zeros while typing. */
export const NumberField = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  id,
  fallback,
}: NumberFieldProps) => {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setDraft(String(value))
    }
  }, [value, focused])

  const commit = (raw: string) => {
    const parsed = Number(raw)
    const base = Number.isFinite(parsed) ? parsed : (fallback ?? min ?? 0)
    const next = clamp(base, min, max)
    setDraft(String(next))
    if (next !== value) {
      onChange(next)
    }
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      step={step}
      className={cn("tabular-nums", className)}
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        commit(draft)
      }}
      onChange={(event) => {
        const next = event.target.value
        if (next === "" || /^-?\d*\.?\d*$/.test(next)) {
          setDraft(next)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commit(draft)
          ;(event.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}
