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
import { NumberField } from "~/components/ui/number-field"
import { Select } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import {
  defaultPdfExportOptions,
  type PdfExportOptions,
  type PdfOrientation,
  type PdfPaperSize,
} from "~/lib/export/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: PdfExportOptions) => void
}

export const ExportPdfDialog = ({ open, onOpenChange, onConfirm }: Props) => {
  const [options, setOptions] = useState<PdfExportOptions>(defaultPdfExportOptions)

  useEffect(() => {
    if (open) {
      setOptions(defaultPdfExportOptions)
    }
  }, [open])

  const patch = (partial: Partial<PdfExportOptions>) => {
    setOptions((prev) => ({ ...prev, ...partial }))
  }

  const patchRender = (key: keyof PdfExportOptions["render"], value: boolean) => {
    setOptions((prev) => ({
      ...prev,
      render: { ...prev.render, [key]: value },
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/40 px-5 py-4">
          <DialogTitle>导出 PDF</DialogTitle>
          <DialogDescription>配置纸张、渲染选项后导出全文</DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70vh,520px)] space-y-4 overflow-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 text-[13px] font-medium">纸张尺寸</div>
              <Select
                value={options.paperSize}
                onChange={(event) => patch({ paperSize: event.target.value as PdfPaperSize })}
                options={[
                  { label: "A4", value: "a4" },
                  { label: "Letter", value: "letter" },
                  { label: "A3", value: "a3" },
                ]}
              />
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">方向</div>
              <Select
                value={options.orientation}
                onChange={(event) => patch({ orientation: event.target.value as PdfOrientation })}
                options={[
                  { label: "纵向", value: "portrait" },
                  { label: "横向", value: "landscape" },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-medium">页边距（毫米）</div>
            <NumberField
              value={options.marginMm}
              min={8}
              max={40}
              fallback={defaultPdfExportOptions.marginMm}
              onChange={(marginMm) => patch({ marginMm })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">范围 8–40</p>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
            <div className="text-[13px] font-medium">渲染开关</div>
            <label className="flex items-center justify-between gap-3 text-[13px]">
              <span>Mermaid 图表</span>
              <Switch checked={options.render.mermaid} onCheckedChange={(v) => patchRender("mermaid", v)} />
            </label>
            <label className="flex items-center justify-between gap-3 text-[13px]">
              <span>LaTeX 公式</span>
              <Switch checked={options.render.math} onCheckedChange={(v) => patchRender("math", v)} />
            </label>
            <label className="flex items-center justify-between gap-3 text-[13px]">
              <span>代码高亮</span>
              <Switch
                checked={options.render.codeHighlight}
                onCheckedChange={(v) => patchRender("codeHighlight", v)}
              />
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span>页码</span>
            <Switch
              checked={options.pageNumbers}
              onCheckedChange={(v) => patch({ pageNumbers: v })}
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 text-[13px]">
              <span>水印</span>
              <Switch
                checked={options.watermarkEnabled}
                onCheckedChange={(v) => patch({ watermarkEnabled: v })}
              />
            </label>
            {options.watermarkEnabled ? (
              <Input
                value={options.watermarkText}
                onChange={(event) => patch({ watermarkText: event.target.value })}
                placeholder="水印文字"
              />
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span>自动目录</span>
            <Switch
              checked={options.tableOfContents}
              onCheckedChange={(v) => patch({ tableOfContents: v })}
            />
          </label>

          <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-3 py-2.5 text-[12px] text-muted-foreground">
            导出范围：全文（选中片段将在后续版本支持）
          </div>
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
