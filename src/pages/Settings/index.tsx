import { FolderOpen, Info, Paintbrush, RotateCcw, Settings2, Sparkles } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { revealItemInDir } from "@tauri-apps/plugin-opener"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Select } from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Switch } from "~/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { defaultSettings, getDefaultWorkspacePaths } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

import type { AppSettings, DefaultOpenMode, ThemeColor, ThemeMode } from "~/lib/workspace"

const sections = [
  { key: "general", label: "常规设置", icon: Settings2 },
  { key: "editor", label: "编辑器设置", icon: Sparkles },
  { key: "files", label: "文件设置", icon: FolderOpen },
  { key: "appearance", label: "外观设置", icon: Paintbrush },
  { key: "about", label: "关于", icon: Info },
] as const

const SettingsPage = () => {
  const navigate = useNavigate()
  const { config, updateSettings, updateWorkspaceConfig, updateUiState } = useWorkspaceStore()
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["key"]>("general")
  const settings = config?.settings ?? defaultSettings

  const updateSetting = (patch: Partial<AppSettings>) => {
    void updateSettings(patch)
  }

  const handleFieldPathChange = async (field: "notesPath" | "assetsPath") => {
    const currentValue = config?.[field] ?? ""
    const nextValue = window.prompt("输入路径", currentValue)
    if (!nextValue) {
      return
    }
    await updateWorkspaceConfig({ [field]: nextValue })
  }

  const handleOpenDirectory = async (field: "notesPath" | "assetsPath") => {
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
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,_rgba(79,124,255,0.14),transparent_28%),var(--background)]">
      <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur">
        <div>
          <div className="text-sm font-semibold">设置</div>
          <div className="text-xs text-muted-foreground">自定义工作区、编辑器与外观体验</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          返回工作区
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <aside className="w-[240px] min-w-[220px] rounded-[20px] border border-border/60 bg-sidebar/80 p-3 shadow-sm">
          <div className="mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">设置分类</div>
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeSection === section.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Icon className="size-4" />
                  {section.label}
                </button>
              )
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-hidden rounded-[20px] border border-border/60 bg-background/80 p-4 shadow-sm">
          <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as (typeof sections)[number]["key"])}>
            <TabsList className="mb-4">
              {sections.map((section) => (
                <TabsTrigger key={section.key} value={section.key}>{section.label}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Settings2 className="size-4 text-primary" />
                  <div>
                    <div className="font-medium">常规</div>
                    <div className="text-sm text-muted-foreground">定义启动行为与文档语言</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">启动时打开上次文件</div>
                      <div className="text-xs text-muted-foreground">恢复上一次编辑内容</div>
                    </div>
                    <Switch checked={settings.startWithLastFile} onCheckedChange={(value) => updateSetting({ startWithLastFile: value })} />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">启用自动保存</div>
                      <div className="text-xs text-muted-foreground">编辑后自动落盘到本地</div>
                    </div>
                    <Switch checked={settings.autoSave} onCheckedChange={(value) => updateSetting({ autoSave: value })} />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/60 px-3 py-3">
                      <div className="mb-2 text-sm font-medium">自动保存间隔（毫秒）</div>
                      <Input type="number" value={settings.autoSaveInterval} onChange={(event) => updateSetting({ autoSaveInterval: Number(event.target.value) })} />
                    </div>
                    <div className="rounded-xl border border-border/60 px-3 py-3">
                      <div className="mb-2 text-sm font-medium">语言</div>
                      <Select value={settings.language} onChange={(event) => updateSetting({ language: event.target.value })} options={[{ label: "简体中文", value: "zh-CN" }]} />
                    </div>
                    <div className="rounded-xl border border-border/60 px-3 py-3">
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="space-y-4">
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <div>
                    <div className="font-medium">编辑器</div>
                    <div className="text-sm text-muted-foreground">控制字体、换行与代码高亮体验</div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border/60 px-3 py-3">
                    <div className="mb-2 text-sm font-medium">字号</div>
                    <Select value={String(settings.editorFontSize)} onChange={(event) => updateSetting({ editorFontSize: Number(event.target.value) })} options={[{ label: "12px", value: "12" }, { label: "14px", value: "14" }, { label: "16px", value: "16" }]} />
                  </div>
                  <div className="rounded-xl border border-border/60 px-3 py-3">
                    <div className="mb-2 text-sm font-medium">字体</div>
                    <Input value={settings.editorFontFamily} onChange={(event) => updateSetting({ editorFontFamily: event.target.value })} />
                  </div>
                  <label className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">显示行号</div>
                      <div className="text-xs text-muted-foreground">在编辑器左侧显示行号</div>
                    </div>
                    <Switch checked={settings.showLineNumbers} onCheckedChange={(value) => updateSetting({ showLineNumbers: value })} />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">自动换行</div>
                      <div className="text-xs text-muted-foreground">让长行自然换行显示</div>
                    </div>
                    <Switch checked={settings.wordWrap} onCheckedChange={(value) => updateSetting({ wordWrap: value })} />
                  </label>
                  <div className="rounded-xl border border-border/60 px-3 py-3">
                    <div className="mb-2 text-sm font-medium">Tab 大小</div>
                    <Select value={String(settings.tabSize)} onChange={(event) => updateSetting({ tabSize: Number(event.target.value) })} options={[{ label: "2", value: "2" }, { label: "4", value: "4" }]} />
                  </div>
                  <label className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">实时预览</div>
                      <div className="text-xs text-muted-foreground">编辑时同步显示预览</div>
                    </div>
                    <Switch checked={settings.livePreview} onCheckedChange={(value) => updateSetting({ livePreview: value })} />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium">代码高亮</div>
                      <div className="text-xs text-muted-foreground">为代码块提供语法高亮</div>
                    </div>
                    <Switch checked={settings.codeHighlight} onCheckedChange={(value) => updateSetting({ codeHighlight: value })} />
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FolderOpen className="size-4 text-primary" />
                  <div>
                    <div className="font-medium">文件</div>
                    <div className="text-sm text-muted-foreground">管理笔记与资源的本地存储路径</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="mb-2 text-sm font-medium">笔记存储位置</div>
                    <div className="mb-2 text-xs text-muted-foreground">{config?.notesPath ?? ""}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => void handleFieldPathChange("notesPath")}>修改路径</Button>
                      <Button variant="outline" size="sm" onClick={() => void handleOpenDirectory("notesPath")}>打开目录</Button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="mb-2 text-sm font-medium">资源存储位置</div>
                    <div className="mb-2 text-xs text-muted-foreground">{config?.assetsPath ?? ""}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => void handleFieldPathChange("assetsPath")}>修改路径</Button>
                      <Button variant="outline" size="sm" onClick={() => void handleOpenDirectory("assetsPath")}>打开目录</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => void handleRestoreDefaults()}>
                      <RotateCcw className="mr-1 size-4" />
                      恢复默认路径
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Paintbrush className="size-4 text-primary" />
                  <div>
                    <div className="font-medium">外观</div>
                    <div className="text-sm text-muted-foreground">选择主题模式与强调色</div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border/60 px-3 py-3">
                    <div className="mb-2 text-sm font-medium">主题</div>
                    <Select value={settings.themeMode} onChange={(event) => updateSetting({ themeMode: event.target.value as ThemeMode })} options={[{ label: "跟随系统", value: "system" }, { label: "浅色", value: "light" }, { label: "深色", value: "dark" }]} />
                  </div>
                  <div className="rounded-xl border border-border/60 px-3 py-3">
                    <div className="mb-2 text-sm font-medium">主题颜色</div>
                    <Select value={settings.themeColor} onChange={(event) => updateSetting({ themeColor: event.target.value as ThemeColor })} options={[{ label: "蓝色", value: "blue" }, { label: "紫色", value: "purple" }, { label: "青色", value: "cyan" }]} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="about" className="space-y-4">
              <div className="rounded-2xl border border-border/60 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  <div>
                    <div className="text-lg font-semibold">Caelum</div>
                    <div className="text-sm text-muted-foreground">本地 Markdown 笔记应用</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <dl className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between"><dt>版本号</dt><dd>0.1.0</dd></div>
                  <div className="flex justify-between"><dt>开源协议</dt><dd>MIT</dd></div>
                  <div className="flex justify-between"><dt>作者</dt><dd>North</dd></div>
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

export default SettingsPage
