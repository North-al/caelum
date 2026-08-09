import { Braces, FileCode2, FileText, Type } from "lucide-react"

import { Button } from "~/components/ui/button"
import { getFileExtension, isMarkdownPath } from "~/lib/file-types"
import { cn } from "~/lib/utils"

interface EditorEmptyGuideProps {
  path: string | null
  onInsertTemplate?: (template: string) => void
  className?: string
}

const MD_GUIDE = `开始书写吧。

# 标题
用空行分隔段落，支持 **粗体**、*斜体* 与 [[双链]]。
`

const JSON_TEMPLATE = `{
  "name": "example",
  "enabled": true
}
`

const INI_TEMPLATE = `[section]
key=value
`

const XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <item id="1">example</item>
</root>
`

/** Lightweight empty-document coach overlay (non-blocking). */
export const EditorEmptyGuide = ({ path, onInsertTemplate, className }: EditorEmptyGuideProps) => {
  if (!path) {
    return null
  }

  const extension = getFileExtension(path)
  const isMd = isMarkdownPath(path)

  if (isMd) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 flex items-start justify-center px-10 pt-16",
          className
        )}
      >
        <div className="max-w-md space-y-3 text-left opacity-70">
          <div className="flex items-center gap-2 text-primary/80">
            <FileText className="size-4" strokeWidth={1.75} />
            <span className="text-[13px] font-medium">书写引导</span>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {MD_GUIDE.trim()}
          </p>
        </div>
      </div>
    )
  }

  if (extension === "json") {
    return (
      <GuideCard
        icon={<Braces className="size-4" strokeWidth={1.75} />}
        title="JSON 空文件"
        description="可先插入极简模板，保存前可用一键格式化整理缩进。"
        actionLabel="插入模板"
        onAction={() => onInsertTemplate?.(JSON_TEMPLATE)}
        className={className}
      />
    )
  }

  if (extension === "ini") {
    return (
      <GuideCard
        icon={<FileCode2 className="size-4" strokeWidth={1.75} />}
        title="INI 空文件"
        description="使用 [section] 与 key=value 组织配置，支持一键格式化。"
        actionLabel="插入模板"
        onAction={() => onInsertTemplate?.(INI_TEMPLATE)}
        className={className}
      />
    )
  }

  if (extension === "xml" || extension === "svg") {
    return (
      <GuideCard
        icon={<FileCode2 className="size-4" strokeWidth={1.75} />}
        title="XML 空文件"
        description="插入基础结构后，可用一键格式化整理缩进。"
        actionLabel="插入模板"
        onAction={() => onInsertTemplate?.(XML_TEMPLATE)}
        className={className}
      />
    )
  }

  return (
    <GuideCard
      icon={<Type className="size-4" strokeWidth={1.75} />}
      title="空文本文件"
      description="直接开始输入即可，内容会实时出现在预览区。"
      className={className}
    />
  )
}

interface GuideCardProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const GuideCard = ({ icon, title, description, actionLabel, onAction, className }: GuideCardProps) => (
  <div
    className={cn(
      "pointer-events-none absolute inset-0 z-10 flex items-start justify-center px-8 pt-14",
      className
    )}
  >
    <div className="max-w-sm space-y-2.5 rounded-2xl border border-border/40 bg-background/70 px-5 py-4 text-left shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 text-primary/80">
        {icon}
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <div className="pointer-events-auto pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 rounded-lg px-2.5 text-[12px]"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  </div>
)

interface PreviewEmptyHintProps {
  className?: string
}

export const PreviewEmptyHint = ({ className }: PreviewEmptyHintProps) => (
  <div
    className={cn(
      "flex h-full min-h-[12rem] items-center justify-center px-6 text-center text-[13px] text-muted-foreground/80",
      className
    )}
  >
    左侧编辑，右侧实时渲染
  </div>
)
