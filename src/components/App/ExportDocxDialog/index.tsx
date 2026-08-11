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
import { Select } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import {
  defaultDocxExportOptions,
  type DocxCompatMode,
  type DocxExportOptions,
} from "~/lib/export/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: DocxExportOptions) => void
}

export const ExportDocxDialog = ({ open, onOpenChange, onConfirm }: Props) => {
  const [options, setOptions] = useState<DocxExportOptions>(defaultDocxExportOptions)

  useEffect(() => {
    if (open) {
      setOptions(defaultDocxExportOptions)
    }
  }, [open])

  const patch = (partial: Partial<DocxExportOptions>) => {
    setOptions((prev) => ({ ...prev, ...partial }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border/40 px-5 py-4">
          <DialogTitle>导出 Word</DialogTitle>
          <DialogDescription>配置兼容模式与图表清晰度后导出全文</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="mb-1.5 text-[13px] font-medium">兼容模式</div>
            <Select
              value={options.compatMode}
              onChange={(event) => patch({ compatMode: event.target.value as DocxCompatMode })}
              options={[
                { label: "Microsoft Office", value: "office" },
                { label: "WPS", value: "wps" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-medium">矢量图清晰度</div>
            <Select
              value={String(options.vectorScale)}
              onChange={(event) => patch({ vectorScale: Number(event.target.value) || 2 })}
              options={[
                { label: "标准 (1x)", value: "1" },
                { label: "高清 (2x)", value: "2" },
                { label: "超清 (3x)", value: "3" },
              ]}
            />
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Mermaid / 复杂公式会按此清晰度栅格化嵌入；WPS 建议使用高清及以上。
            </p>
          </div>

          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span>自动目录</span>
            <Switch
              checked={options.tableOfContents}
              onCheckedChange={(v) => patch({ tableOfContents: v })}
            />
          </label>
        </div>

        <DialogFooter className="border-t border-border/40 px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(options)
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
