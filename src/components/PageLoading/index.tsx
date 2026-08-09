import { CaelumLogo } from "~/components/App/CaelumLogo"
import { cn } from "~/lib/utils"

export type PageLoadingScene = "workspace" | "document" | "tree" | "settings" | "route"

interface Props {
  className?: string
  /** Lightweight scene copy. */
  label?: string
  scene?: PageLoadingScene
}

const SCENE_LABELS: Record<PageLoadingScene, string> = {
  workspace: "读取资源目录...",
  document: "加载文档中...",
  tree: "读取资源目录...",
  settings: "加载设置...",
  route: "加载页面...",
}

/** Theme-aware lightweight loading surface (no flashy ping). */
export const PageLoading = ({ className, label, scene = "route" }: Props) => {
  const text = label ?? SCENE_LABELS[scene]

  return (
    <div
      className={cn(
        "page-loading flex h-full min-h-0 w-full flex-col items-center justify-center gap-4 bg-background text-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="relative flex size-12 items-center justify-center">
        <span className="page-loading-ring absolute inset-0 rounded-full border-2 border-border/60 border-t-primary/70" />
        <CaelumLogo className="relative size-6 text-primary/90" />
      </div>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  )
}
