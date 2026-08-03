import { FolderOpen, Info, RotateCcw, Settings2, Sparkles } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { revealItemInDir } from "@tauri-apps/plugin-opener"

import { InputDialog } from "~/components/App/InputDialog"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Select } from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Switch } from "~/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { WindowControls } from "~/layouts/components/WindowControls"
import { defaultSettings, getDefaultWorkspacePaths } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

import type { AppSettings, DefaultOpenMode } from "~/lib/workspace"

const sections = [
  { key: "general", label: "常规", icon: Settings2 },
  { key: "editor", label: "编辑器", icon: Sparkles },
  { key: "files", label: "文件", icon: FolderOpen },
  { key: "about", label: "关于", icon: Info },
] as const

type PathField = "notesPath" | "assetsPath"

const SettingsPage = () => {
  const navigate = useNavigate()
  const { config, updateSettings, updateWorkspaceConfig, updateUiState } = useWorkspaceStore()
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["key"]>("general")
  const [pathDialog, setPathDialog] = useState<{ field: PathField; value: string } | null>(null)
  const settings = config?.settings ?? defaultSettings

  const updateSetting = (patch: Partial<AppSettings>) => {
    void updateSettings(patch)
  }

  const openPathDialog = (field: PathField) => {
    setPathDialog({ field, value: config?.[field] ?? "" })
  }

  const handleSubmitPath = async (value: string) => {
    if (!pathDialog) {
      return
    }
    await updateWorkspaceConfig({ [pathDialog.field]: value })
  }

  const handleOpenDirectory = async (field: PathField) => {
    const targetPath = config?.[field]
    if (targetPath) {
      await revealItemInDir(targetPath)
    }
  }

  const handleRestoreDefaults = async () => {
    const defaults = await getDefaultWorkspacePaths()
    await updateWorkspaceConfig({ notesPath: defaults.notesPath, assetsPath: defaults.assetsPath })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <header className="flex h-11 shrink-0 items-stretch border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4" data-tauri-drag-region>
          <div>
            <div className="text-sm font-semibold tracking-tight">设置</div>
            <div className="text-[11px] text-muted-foreground">工作区、编辑器与文件路径</div>
          </div>
          <Button variant="outline" size="sm" className="h-7 rounded-md text-xs" onClick={() => navigate("/")}>
            返回工作区
          </Button>
        </div>
        <WindowControls />
      </header>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        <aside className="w-[200px] shrink-0 overflow-auto rounded-xl border border-border/50 bg-sidebar/60 p-2">
          <div className="space-y-0.5">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                    activeSection === section.key
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {section.label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            主题与强调色在侧边栏「外观」中调整
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto rounded-xl border border-border/50 bg-card/40 p-5">
          <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as (typeof sections)[number]["key"])}>
            <TabsList className="mb-5">
              {sections.map((section) => (
                <TabsTrigger key={section.key} value={section.key}>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-semibold tracking-tight">启动与保存</div>
                <div className="mb-3 text-xs text-muted-foreground">推荐保持开启，减少手动操作</div>
                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        启动时打开上次文件
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">推荐</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">下次启动自动恢复上次编辑的文档</div>
                    </div>
                    <Switch
                      checked={settings.startWithLastFile}
                      onCheckedChange={(value) => updateSetting({ startWithLastFile: value })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        自动保存
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">推荐</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">编辑后自动写入本地文件，默认开启</div>
                    </div>
                    <Switch checked={settings.autoSave} onCheckedChange={(value) => updateSetting({ autoSave: value })} />
                  </label>
                </div>
              </div>

              {settings.autoSave ? (
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="mb-2 text-sm font-medium">自动保存间隔</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={200}
                      step={100}
                      className="max-w-[160px]"
                      value={settings.autoSaveInterval}
                      onChange={(event) =>
                        updateSetting({ autoSaveInterval: Math.max(200, Number(event.target.value) || 600) })
                      }
                    />
                    <span className="text-xs text-muted-foreground">毫秒（建议 600）</span>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="mb-2 text-sm font-medium">语言</div>
                  <Select
                    value={settings.language}
                    onChange={(event) => updateSetting({ language: event.target.value })}
                    options={[{ label: "简体中文", value: "zh-CN" }]}
                  />
                </div>
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="mb-2 text-sm font-medium">默认打开模式</div>
                  <Select
                    value={config?.uiState.defaultOpenMode ?? "preview"}
                    onChange={(event) => void updateUiState({ defaultOpenMode: event.target.value as DefaultOpenMode })}
                    options={[
                      { label: "预览", value: "preview" },
                      { label: "编辑", value: "editor" },
                    ]}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="space-y-4">
              <div className="mb-1 text-sm font-semibold tracking-tight">编辑体验</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="mb-2 text-sm font-medium">字号</div>
                  <Select
                    value={String(settings.editorFontSize > 0 ? settings.editorFontSize : 14)}
                    onChange={(event) => updateSetting({ editorFontSize: Number(event.target.value) })}
                    options={[
                      { label: "12px", value: "12" },
                      { label: "14px", value: "14" },
                      { label: "16px", value: "16" },
                      { label: "18px", value: "18" },
                    ]}
                  />
                </div>
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="mb-2 text-sm font-medium">字体</div>
                  <Input
                    value={settings.editorFontFamily}
                    onChange={(event) => updateSetting({ editorFontFamily: event.target.value })}
                  />
                </div>
                <div className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="mb-2 text-sm font-medium">Tab 大小</div>
                  <Select
                    value={String(settings.tabSize || 2)}
                    onChange={(event) => updateSetting({ tabSize: Number(event.target.value) })}
                    options={[
                      { label: "2", value: "2" },
                      { label: "4", value: "4" },
                    ]}
                  />
                </div>
                <label className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">显示行号</div>
                    <div className="text-xs text-muted-foreground">编辑器左侧行号</div>
                  </div>
                  <Switch
                    checked={settings.showLineNumbers}
                    onCheckedChange={(value) => updateSetting({ showLineNumbers: value })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">自动换行</div>
                    <div className="text-xs text-muted-foreground">长行自动折行</div>
                  </div>
                  <Switch checked={settings.wordWrap} onCheckedChange={(value) => updateSetting({ wordWrap: value })} />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">代码高亮</div>
                    <div className="text-xs text-muted-foreground">预览区代码块着色</div>
                  </div>
                  <Switch
                    checked={settings.codeHighlight}
                    onCheckedChange={(value) => updateSetting({ codeHighlight: value })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">滚动联动</div>
                    <div className="text-xs text-muted-foreground">分屏时同步滚动</div>
                  </div>
                  <Switch checked={settings.scrollSync} onCheckedChange={(value) => updateSetting({ scrollSync: value })} />
                </label>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <div className="mb-1 text-sm font-semibold tracking-tight">本地路径</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="mb-1 text-sm font-medium">笔记目录</div>
                  <div className="mb-3 break-all text-xs text-muted-foreground">{config?.notesPath ?? ""}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPathDialog("notesPath")}>
                      修改路径
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleOpenDirectory("notesPath")}>
                      打开目录
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="mb-1 text-sm font-medium">资源目录</div>
                  <div className="mb-3 break-all text-xs text-muted-foreground">{config?.assetsPath ?? ""}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPathDialog("assetsPath")}>
                      修改路径
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleOpenDirectory("assetsPath")}>
                      打开目录
                    </Button>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void handleRestoreDefaults()}>
                  <RotateCcw className="mr-1 size-4" />
                  恢复默认路径
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="about" className="space-y-4">
              <div className="rounded-xl border border-border/60 p-5">
                <div className="text-lg font-semibold tracking-tight">Caelum</div>
                <div className="mt-1 text-sm text-muted-foreground">本地 Markdown 笔记应用</div>
                <Separator className="my-4" />
                <dl className="space-y-2.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>版本</dt>
                    <dd className="text-foreground">0.1.0</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>协议</dt>
                    <dd className="text-foreground">MIT</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>作者</dt>
                    <dd className="text-foreground">North</dd>
                  </div>
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <InputDialog
        open={pathDialog !== null}
        title="修改路径"
        description="请输入新的存储路径"
        defaultValue={pathDialog?.value ?? ""}
        inputPlaceholder="绝对路径"
        confirmLabel="保存"
        onOpenChange={(open) => {
          if (!open) {
            setPathDialog(null)
          }
        }}
        onSubmit={handleSubmitPath}
      />
    </div>
  )
}

export default SettingsPage
