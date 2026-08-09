import { isValidElement, useMemo, useState, type ReactNode } from "react"
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import { writeTextToClipboard } from "~/lib/workspace"
import { cn } from "~/lib/utils"

interface Props {
  children?: ReactNode
  className?: string
  showLineNumbers?: boolean
}

const extractText = (node: ReactNode): string => {
  if (node == null || typeof node === "boolean") {
    return ""
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("")
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children)
  }
  return ""
}

const languageFromClassName = (className?: string) => {
  if (!className) {
    return ""
  }
  const match = /language-([a-z0-9_+-]+)/i.exec(className)
  return match?.[1] ?? ""
}

const getCodeMeta = (children: ReactNode) => {
  const candidate = Array.isArray(children)
    ? children.find((child) => isValidElement(child) && child.type === "code")
    : children

  if (isValidElement<{ className?: string; children?: ReactNode }>(candidate) && candidate.type === "code") {
    return {
      className: candidate.props.className,
      language: languageFromClassName(candidate.props.className),
      body: candidate.props.children,
    }
  }

  return { className: undefined, language: "", body: children }
}

export const PreviewCodeBlock = ({ children, className, showLineNumbers = false }: Props) => {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)

  const meta = useMemo(() => getCodeMeta(children), [children])
  const plainText = useMemo(() => extractText(children).replace(/\n$/, ""), [children])
  const lineCount = useMemo(() => (plainText.length === 0 ? 1 : plainText.split("\n").length), [plainText])

  const handleCopy = async () => {
    try {
      await writeTextToClipboard(plainText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      toast.error("复制失败", {
        description: error instanceof Error ? error.message : "无法写入剪贴板",
      })
    }
  }

  return (
    <div className={cn("markdown-code-block group relative my-[1.1em] overflow-hidden rounded-[0.65rem] border border-border/70", className)}>
      <div className="flex h-9 items-center gap-2 border-b border-border/50 bg-muted/40 px-2.5">
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background/80 hover:text-foreground"
          aria-label={collapsed ? "展开代码块" : "折叠代码块"}
          title={collapsed ? "展开" : "折叠"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {meta.language || "code"}
          {collapsed ? ` · ${lineCount} 行` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground"
          onClick={() => void handleCopy()}
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>

      {!collapsed ? (
        <div className={cn("markdown-code-body relative overflow-x-auto", showLineNumbers && "with-line-numbers")}>
          {showLineNumbers ? (
            <div className="markdown-code-lines" aria-hidden>
              {Array.from({ length: lineCount }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
          ) : null}
          <pre className="hljs !m-0 !rounded-none !border-0 !bg-transparent">
            <code className={cn("hljs", meta.className)}>{meta.body}</code>
          </pre>
        </div>
      ) : null}
    </div>
  )
}
