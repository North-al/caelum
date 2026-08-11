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
import {
  listMermaidBatchItems,
  type MermaidBatchItem,
} from "~/lib/export/mermaid-batch-items"
import { cn } from "~/lib/utils"

export type MermaidBatchFormat = "svg" | "png"

export interface MermaidBatchExportSettings {
  format: MermaidBatchFormat
  background: string
  padding: number
  scale: number
  selectedIds: string[]
  items: MermaidBatchItem[]
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
  content: string
  defaultFormat?: MermaidBatchFormat
  onConfirm: (settings: MermaidBatchExportSettings) => void
}

export const ExportMermaidBatchDialog = ({
  open,
  onOpenChange,
  content,
  defaultFormat = "png",
  onConfirm,
}: Props) => {
  const items = useMemo(() => listMermaidBatchItems(content), [content])
  const [format, setFormat] = useState<MermaidBatchFormat>(defaultFormat)
  const [background, setBackground] = useState("#ffffff")
  const [padding, setPadding] = useState(16)
  const [scale, setScale] = useState(2)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [customOpen, setCustomOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState("#ffffff")

  useEffect(() => {
    if (!open) return
    setFormat(defaultFormat)
    setBackground("#ffffff")
    setPadding(16)
    setScale(2)
    setSelectedIds(items.map((item) => item.id))
    setCustomOpen(false)
    setHexDraft("#ffffff")
  }, [open, defaultFormat, items])

  const customActive = !isPreset(background)
  const pickerHex = useMemo(() => {
    if (background === "transparent") return "#ffffff"
    return normalizeHex(background) ?? "#ffffff"
  }, [background])

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const selectedCount = selectedIds.length

  const toggleId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0" showCloseButton>
        <DialogHeader className="border-b border-border/40 px-5 py-4">
          <DialogTitle>批量导出 Mermaid</DialogTitle>
          <DialogDescription>
            勾选要导出的图表
            {format === "png" ? "，并配置 PNG 底色与清晰度" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-[13px]">格式</Label>
            <Select
              value={format}
              onChange={(event) => setFormat(event.target.value as MermaidBatchFormat)}
              options={[
                { label: "PNG 图片", value: "png" },
                { label: "SVG 矢量", value: "svg" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[13px]">
                图表（已选 {selectedCount}/{items.length}）
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => setSelectedIds(items.map((item) => item.id))}
                  disabled={allSelected}
                >
                  全选
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedCount === 0}
                >
                  清空
                </Button>
              </div>
            </div>

            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border/50 bg-muted/15 p-1.5">
              {items.length === 0 ? (
                <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                  当前文档没有 Mermaid 图表
                </div>
              ) : (
                items.map((item, order) => {
                  const checked = selectedIds.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition",
                        checked ? "bg-background shadow-sm" : "hover:bg-background/60"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(item.id)}
                        className="mt-1 size-3.5 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13px] font-medium">
                          <span className="text-muted-foreground">{order + 1}.</span>
                          <span>{item.kind}</span>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                          {item.preview}
                        </span>
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {format === "png" ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[13px]">底色</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {background === "transparent"
                      ? "透明"
                      : customActive
                        ? "自定义"
                        : (PRESET_BACKGROUNDS.find((item) => item.value === background)?.label ??
                          "自定义")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {PRESET_BACKGROUNDS.map((item) => {
                    const selected = background === item.value
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
                          setBackground(item.value)
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
                      const hex = normalizeHex(background) ?? "#3b82f6"
                      setHexDraft(hex)
                      if (!customActive) {
                        setBackground(hex)
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
                            setBackground(hex)
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
                            if (hex) setBackground(hex)
                          }}
                          onBlur={() => {
                            const hex = normalizeHex(hexDraft)
                            if (hex) {
                              setHexDraft(hex)
                              setBackground(hex)
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
                    value={padding}
                    min={0}
                    max={80}
                    fallback={16}
                    onChange={setPadding}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">清晰度</Label>
                  <Select
                    value={String(scale)}
                    onChange={(event) => setScale(Number(event.target.value) || 2)}
                    options={[
                      { label: "1x", value: "1" },
                      { label: "2x", value: "2" },
                      { label: "3x", value: "3" },
                    ]}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/40 px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => {
              onConfirm({
                format,
                background,
                padding,
                scale,
                selectedIds,
                items,
              })
              onOpenChange(false)
            }}
          >
            导出 {selectedCount > 0 ? selectedCount : ""} 个
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
