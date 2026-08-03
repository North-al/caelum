import { CaelumLogo } from "~/components/App/CaelumLogo"
import { cn } from "~/lib/utils"

interface Props {
  className?: string
  label?: string
}

export const PageLoading = ({ className, label = "正在加载…" }: Props) => {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 bg-background text-foreground",
        className
      )}
    >
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/15" />
        <span className="absolute inset-1 animate-pulse rounded-xl bg-primary/10" />
        <CaelumLogo className="relative size-12 text-primary drop-shadow-sm" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-medium tracking-tight text-foreground/85">{label}</div>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.2s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.1s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-primary/70" />
        </div>
      </div>
    </div>
  )
}
