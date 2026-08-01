import type { RefObject } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import { resolveMarkdownAssetUrl } from "~/lib/markdown"
import { getParentPath } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

interface Props {
  content: string
  onScroll?: (scrollTop: number) => void
  containerRef?: RefObject<HTMLDivElement | null>
}

export const MarkdownPreview = ({ content, onScroll, containerRef }: Props) => {
  const { config, selectedFilePath } = useWorkspaceStore()
  const workspaceRoot = config ? getParentPath(config.notesPath) : ""
  const plugins = config?.settings.codeHighlight ? [rehypeHighlight] : []

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto rounded-xl bg-background/60 p-6"
      onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={plugins}
        components={{
          img: ({ src, alt, ...props }) => {
            const resolvedSrc = typeof src === "string"
              ? resolveMarkdownAssetUrl(src, selectedFilePath ?? "", workspaceRoot)
              : src

            return <img src={resolvedSrc} alt={alt} {...props} className="my-4 max-w-full rounded-lg border border-border/30" />
          },
          a: ({ href, children, ...props }) => {
            const safeHref = typeof href === "string" ? href : ""
            return (
              <a href={safeHref} {...props} className="text-primary underline-offset-4 hover:underline">
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
