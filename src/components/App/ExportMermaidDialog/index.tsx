import { useEffect, useMemo, useState } from "react"
import { Check, Pipette } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import { NumberField } from "~/components/ui/number-field"
import { Select } from "~/components/ui/select"
import { cn } from "~/lib/utils"

export type MermaidExportFormat = "svg" | "png"

export interface MermaidExportSettings {
  format: MermaidExportFormat
  background: string
  padding: number
  scale: number
}

export const defaultMermaidExportSettings: MermaidExportSettings = {
  format: "png",
  background: "#ffffff",
  padding: 16,
  scale: 2,
}

const PRESET_BACKGROUNDS = [
  { label: "白色", value: "#ffffff" },
  { label: "透明", value: "transparent" },
  { label: "浅灰", value: "#f8fafc" },
  { label: "雾蓝", value: "#eef2ff" },
  { label: "深色", value: "#0f172a" },
] as const

const normalizeHex = (value: string) => {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, a, b, c] = raw
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return null
}

const isPreset = (value: string) => PRESET_BACKGROUNDS.some((item) => item.value === value)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultFormat?: MermaidExportFormat
  onConfirm: (settings: MermaidExportSettings) => void
}

export const ExportMermaidDialog = ({
  open,
  onOpenChange,
  defaultFormat = "png",
  onConfirm,
}: Props) => {
  const [settings, setSettings] = useState<MermaidExportSettings>({
    ...defaultMermaidExportSettings,
    format: defaultFormat,
  })
  const [customOpen, setCustomOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState("#ffffff")

  useEffect(() => {
    if (open) {
      setSettings({ ...defaultMermaidExportSettings, format: defaultFormat })
      setCustomOpen(false)
      setHexDraft("#ffffff")
    }
  }, [open, defaultFormat])

  const patch = (partial: Partial<MermaidExportSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  const customActive = !isPreset(settings.background)
  const pickerHex = useMemo(() => {
    if (settings.background === "transparent") return "#ffffff"
    return normalizeHex(settings.background) ?? "#ffffff"
  }, [settings.background])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0" showCloseButton>
        <DialogHeader className="border-b border-border/40 px-5 py-4">
          <DialogTitle>导出 Mermaid 图表</DialogTitle>
          <DialogDescription>配置底色、边距与清晰度后导出当前图</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-[13px]">格式</Label>
            <Select
              value={settings.format}
              onChange={(event) => patch({ format: event.target.value as MermaidExportFormat })}
              options={[
                { label: "PNG 图片", value: "png" },
                { label: "SVG 矢量", value: "svg" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[13px]">底色</Label>
              <span className="text-[11px] text-muted-foreground">
                {settings.background === "transparent"
                  ? "透明"
                  : customActive
                    ? "自定义"
                    : (PRESET_BACKGROUNDS.find((item) => item.value === settings.background)?.label ??
                      "自定义")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_BACKGROUNDS.map((item) => {
                const selected = settings.background === item.value
                const transparent = item.value === "transparent"
                return (
                  <button
                    key={item.value}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-pressed={selected}
                    onClick={() => {
                      setCustomOpen(false)
                      patch({ background: item.value })
                    }}
                    className={cn(
                      "relative size-9 rounded-full border border-black/10 shadow-sm outline-none transition",
                      "hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-ring/50",
                      selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={
                      transparent
                        ? {
                            backgroundImage:
                              "linear-gradient(45deg,#d4d4d8 25%,transparent 25%),linear-gradient(-45deg,#d4d4d8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4d8 75%),linear-gradient(-45deg,transparent 75%,#d4d4d8 75%)",
                            backgroundSize: "10px 10px",
                            backgroundPosition: "0 0,0 5px,5px -5px,-5px 0",
                            backgroundColor: "#fff",
                          }
                        : { backgroundColor: item.value }
                    }
                  >
                    {selected ? (
                      <Check
                        className={cn(
                          "absolute inset-0 m-auto size-4 drop-shadow-sm",
                          item.value === "#0f172a" ? "text-white" : "text-foreground"
                        )}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </button>
                )
              })}

              <button
                type="button"
                title="自定义颜色"
                aria-label="自定义颜色"
                aria-pressed={customActive || customOpen}
                onClick={() => {
                  setCustomOpen(true)
                  const hex = normalizeHex(settings.background) ?? "#3b82f6"
                  setHexDraft(hex)
                  if (!customActive) {
                    patch({ background: hex })
                  }
                }}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full border border-dashed border-border/80",
                  "bg-muted/40 text-muted-foreground outline-none transition hover:bg-muted/70",
                  "focus-visible:ring-2 focus-visible:ring-ring/50",
                  (customActive || customOpen) &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {customActive ? (
                  <span
                    className="absolute inset-1 rounded-full border border-black/10"
                    style={{ backgroundColor: pickerHex }}
                  />
                ) : (
                  <Pipette className="size-3.5" />
                )}
              </button>
            </div>

            {customOpen || customActive ? (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border/60 shadow-inner">
                    <span
                      className="absolute inset-0"
                      style={{ backgroundColor: pickerHex }}
                    />
                    <input
                      type="color"
                      value={pickerHex}
                      onChange={(event) => {
                        const hex = event.target.value.toLowerCase()
                        setHexDraft(hex)
                        patch({ background: hex })
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label="选择颜色"
                    />
                  </label>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-[12px] font-medium text-foreground/80">自定义颜色</div>
                    <input
                      value={hexDraft}
                      onChange={(event) => {
                        const next = event.target.value
                        setHexDraft(next)
                        const hex = normalizeHex(next)
                        if (hex) {
                          patch({ background: hex })
                        }
                      }}
                      onBlur={() => {
                        const hex = normalizeHex(hexDraft)
                        if (hex) {
                          setHexDraft(hex)
                          patch({ background: hex })
                        } else {
                          setHexDraft(pickerHex)
                        }
                      }}
                      spellCheck={false}
                      className="h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-[12px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">边距（px）</Label>
              <NumberField
                value={settings.padding}
                min={0}
                max={80}
                fallback={16}
                onChange={(padding) => patch({ padding })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">清晰度</Label>
              <Select
                value={String(settings.scale)}
                onChange={(event) => patch({ scale: Number(event.target.value) || 2 })}
                options={[
                  { label: "1x", value: "1" },
                  { label: "2x", value: "2" },
                  { label: "3x", value: "3" },
                ]}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(settings)
              onOpenChange(false)
            }}
          >
            导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
