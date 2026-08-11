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
  workspace: "正在打开工作区",
  document: "正在加载文档",
  tree: "正在读取目录",
  settings: "正在加载设置",
  route: "正在加载",
}

/** Calm branded loading surface — soft aura, quiet motion, no harsh spinner. */
export const PageLoading = ({ className, label, scene = "route" }: Props) => {
  const text = label ?? SCENE_LABELS[scene]

  return (
    <div
      className={cn(
        "page-loading relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="page-loading-aura pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col items-center gap-5">
        <div className="relative flex size-[4.25rem] items-center justify-center">
          <span className="page-loading-orbit absolute inset-0 rounded-full" aria-hidden />
          <span className="page-loading-orbit-arm absolute inset-0" aria-hidden>
            <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_45%,transparent)]" />
          </span>
          <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_18%,transparent)]">
            <CaelumLogo className="size-7" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <p className="text-[13px] font-medium tracking-wide text-foreground/80">{text}</p>
          <div className="page-loading-bars flex items-center gap-1" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}
