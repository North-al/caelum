import type { KeyboardEvent, PointerEvent, ReactNode } from "react"
import { Check, Copy, GripVertical, Trash2 } from "lucide-react"

import { cn } from "~/lib/utils"

interface Props {
  active?: boolean
  dragging?: boolean
  done?: boolean
  heading?: boolean
  showGrip?: boolean
  placeholder?: string
  value?: string
  preview?: boolean
  tags?: string[]
  tagTone?: (tag: string) => string
  inputRef?: (node: HTMLInputElement | null) => void
  onFocus?: () => void
  onChange?: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  onToggleCheck?: () => void
  checked?: boolean
  onCopy?: () => void
  onRemove?: () => void
  onGripDown?: (event: PointerEvent<HTMLButtonElement>) => void
  onGripMove?: (event: PointerEvent<HTMLButtonElement>) => void
  onGripUp?: (event: PointerEvent<HTMLButtonElement>) => void
  trailing?: ReactNode
}

export const GlassStreamRow = ({
  active,
  dragging,
  done,
  heading,
  showGrip,
  placeholder,
  value = "",
  preview,
  tags = [],
  tagTone,
  inputRef,
  onFocus,
  onChange,
  onKeyDown,
  onToggleCheck,
  checked,
  onCopy,
  onRemove,
  onGripDown,
  onGripMove,
  onGripUp,
  trailing,
}: Props) => {
  return (
    <div
      className={cn(
        "glass-stream-row group",
        active && "is-active",
        dragging && "is-dragging",
        done && "is-done"
      )}
    >
      {showGrip ? (
        <button
          type="button"
          tabIndex={-1}
          className="glass-stream-grip"
          aria-label="拖动排序"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
        >
          <GripVertical className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}

      <button
        type="button"
        className={cn("glass-stream-check", checked && "is-checked", heading && "invisible")}
        aria-label={checked ? "取消完成" : "标为完成"}
        onClick={onToggleCheck}
      >
        {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </button>

      <div className="glass-stream-body">
        {preview ? (
          <p className={cn("glass-stream-text truncate", heading && "is-heading")}>{value || "空白"}</p>
        ) : (
          <input
            ref={inputRef}
            value={value}
            spellCheck={false}
            placeholder={placeholder}
            className={cn("glass-stream-input", heading && "is-heading")}
            onFocus={onFocus}
            onChange={(event) => onChange?.(event.target.value)}
            onKeyDown={onKeyDown}
          />
        )}
      </div>

      <div className="glass-stream-trailing">
        {tags.map((tag) => (
          <span key={tag} className={cn("glass-stream-tag hidden sm:inline", tagTone?.(tag))}>
            {tag}
          </span>
        ))}
        {trailing}
        <div className="glass-stream-row-actions">
          <button
            type="button"
            className="glass-stream-icon-btn"
            title="复制这一条"
            aria-label="复制这一条"
            onClick={(event) => {
              event.stopPropagation()
              onCopy?.()
            }}
          >
            <Copy className="size-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="glass-stream-icon-btn"
            title="删除这一条"
            aria-label="删除这一条"
            onClick={(event) => {
              event.stopPropagation()
              onRemove?.()
            }}
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}
