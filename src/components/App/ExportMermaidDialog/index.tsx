import { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Select } from "~/components/ui/select"
import { Label } from "~/components/ui/label"

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
  { label: "透明（仅 SVG）", value: "transparent" },
  { label: "浅灰", value: "#f8fafc" },
  { label: "深色", value: "#0f172a" },
]

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

  useEffect(() => {
    if (open) {
      setSettings({ ...defaultMermaidExportSettings, format: defaultFormat })
    }
  }, [open, defaultFormat])

  const patch = (partial: Partial<MermaidExportSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  const transparentBlocked = settings.format === "png" && settings.background === "transparent"

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
              onChange={(event) => {
                const format = event.target.value as MermaidExportFormat
                patch({
                  format,
                  background:
                    format === "png" && settings.background === "transparent"
                      ? "#ffffff"
                      : settings.background,
                })
              }}
              options={[
                { label: "PNG 图片", value: "png" },
                { label: "SVG 矢量", value: "svg" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px]">底色</Label>
            <Select
              value={
                PRESET_BACKGROUNDS.some((item) => item.value === settings.background)
                  ? settings.background
                  : "__custom"
              }
              onChange={(event) => {
                const value = event.target.value
                if (value === "__custom") {
                  return
                }
                patch({ background: value })
              }}
              options={[
                ...PRESET_BACKGROUNDS.filter(
                  (item) => settings.format === "svg" || item.value !== "transparent"
                ),
                { label: "自定义…", value: "__custom" },
              ]}
            />
            <Input
              value={settings.background}
              onChange={(event) => patch({ background: event.target.value })}
              placeholder="#ffffff"
              className="mt-2 font-mono text-[12px]"
            />
            {transparentBlocked ? (
              <p className="text-[12px] text-amber-600 dark:text-amber-400">
                PNG 不支持透明底，请改用白色或导出 SVG。
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">边距（px）</Label>
              <Input
                type="number"
                min={0}
                max={80}
                value={settings.padding}
                onChange={(event) =>
                  patch({ padding: Math.min(80, Math.max(0, Number(event.target.value) || 0)) })
                }
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
            disabled={transparentBlocked}
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
