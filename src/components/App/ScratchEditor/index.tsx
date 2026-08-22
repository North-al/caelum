import { useMemo, type RefObject } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "~/lib/utils"

interface Props {
  value: string
  onChange: (value: string) => void
  preview: boolean
  placeholder?: string
  autoFocus?: boolean
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

export const ScratchEditor = ({
  value,
  onChange,
  preview,
  placeholder = "此刻想到的…",
  autoFocus,
  textareaRef,
}: Props) => {
  const markdown = useMemo(() => value || "", [value])

  if (preview) {
    return (
      <div className="scratch-md min-h-0 flex-1 overflow-auto px-4 pb-4 text-[13.5px] leading-[1.65]">
        {markdown.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--paper-muted)" }}>
            还没有内容。切回书写即可记下。
          </p>
        )}
      </div>
    )
  }

  return (
    <textarea
      ref={textareaRef}
      autoFocus={autoFocus}
      value={value}
      spellCheck={false}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "scratch-input min-h-0 flex-1 resize-none border-0 bg-transparent px-4 pb-4",
        "text-[14px] leading-[1.65] outline-none"
      )}
    />
  )
}
