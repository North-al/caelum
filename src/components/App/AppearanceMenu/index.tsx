import { Check, Monitor, Moon, Palette, Sun } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"
import { useWorkspaceStore } from "~/store/workspace"

import type { ThemeColor, ThemeMode } from "~/lib/workspace"

const themeModes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "跟随系统", icon: Monitor },
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
]

const themeColors: { value: ThemeColor; label: string; swatch: string }[] = [
  { value: "blue", label: "蓝色", swatch: "oklch(0.52 0.16 252)" },
  { value: "purple", label: "紫色", swatch: "oklch(0.60 0.18 315)" },
  { value: "cyan", label: "青色", swatch: "oklch(0.62 0.16 190)" },
]

interface AppearanceMenuProps {
  triggerClassName?: string
  compact?: boolean
}

/** Theme mode + accent color quick menu. */
export const AppearanceMenu = ({ triggerClassName, compact = false }: AppearanceMenuProps) => {
  const { config, updateSettings } = useWorkspaceStore()
  const themeMode = config?.settings.themeMode ?? "system"
  const themeColor = config?.settings.themeColor ?? "blue"

  const trigger = (
    <DropdownMenuTrigger
      render={
        <Button
          variant="ghost"
          size={compact ? "icon-sm" : "sm"}
          className={cn(
            compact
              ? "size-8 rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-background/80 hover:text-foreground"
              : "h-9 w-full justify-start gap-2 rounded-xl px-3 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-muted/80 hover:text-foreground",
            triggerClassName
          )}
          aria-label="主题"
        />
      }
    >
      <Palette className="size-4 shrink-0" strokeWidth={1.75} />
      {compact ? null : <span>主题</span>}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex">{trigger}</span>} />
          <TooltipContent side="right">主题</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent align="start" side="top" className="w-72 rounded-xl p-2 shadow-lg">
        <div className="px-1.5 pb-1 text-xs font-medium text-muted-foreground">主题模式</div>
        <div className="grid grid-cols-3 gap-1.5">
          {themeModes.map((mode) => {
            const Icon = mode.icon
            const active = themeMode === mode.value
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => void updateSettings({ themeMode: mode.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors duration-150",
                  active
                    ? "border-primary/35 bg-primary/10 text-foreground"
                    : "border-border/50 bg-background/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                <span className="text-[11px] font-medium">{mode.label}</span>
              </button>
            )
          })}
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="px-1.5 pb-1 text-xs font-medium text-muted-foreground">强调色</div>
        <div className="flex flex-col gap-1">
          {themeColors.map((color) => {
            const active = themeColor === color.value
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => void updateSettings({ themeColor: color.value })}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition-colors duration-150",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: color.swatch,
                    boxShadow: active
                      ? `0 0 0 2px var(--background), 0 0 0 4px ${color.swatch}`
                      : undefined,
                  }}
                >
                  {active ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                </span>
                {color.label}
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
