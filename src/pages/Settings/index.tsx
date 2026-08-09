import { useEffect, useState } from "react"
import {
  ArrowLeft,
  FolderOpen,
  Info,
  Keyboard,
  RotateCcw,
  Settings2,
  Sparkles,
  Palette,
} from "lucide-react"
import { useNavigate } from "react-router"
import { revealItemInDir } from "@tauri-apps/plugin-opener"

import { CaelumLogo } from "~/components/App/CaelumLogo"
import { InputDialog } from "~/components/App/InputDialog"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Select } from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Switch } from "~/components/ui/switch"
import { WindowControls } from "~/layouts/components/WindowControls"
import { APP_CHANGELOG, APP_FEATURES, APP_VERSION } from "~/lib/app-meta"
import { HIGHLIGHT_THEME_OPTIONS } from "~/lib/highlight-themes"
import { APP_SHORTCUTS } from "~/lib/shortcuts"
import {
  defaultSettings,
  getAppPaths,
  getDefaultWorkspacePaths,
  type AppPaths,
  type AppSettings,
  type DefaultOpenMode,
  type ThemeColor,
  type ThemeMode,
} from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

const sections = [
  { key: "general", label: "常规", description: "启动与自动保存", icon: Settings2 },
  { key: "editor", label: "编辑器", description: "字体与阅读体验", icon: Sparkles },
  { key: "appearance", label: "外观", description: "主题与强调色", icon: Palette },
  { key: "files", label: "文件", description: "本地存储路径", icon: FolderOpen },
  { key: "shortcuts", label: "快捷键", description: "当前可用快捷键一览", icon: Keyboard },
  { key: "about", label: "关于", description: "版本、功能与更新说明", icon: Info },
] as const

type PathField = "notesPath" | "assetsPath"

const FONT_OPTIONS = [
  {
    id: "system",
    label: "系统等宽",
    stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  {
    id: "consolas",
    label: "Consolas",
    stack: "Consolas, ui-monospace, monospace",
  },
  {
    id: "cascadia",
    label: "Cascadia Code",
    stack: '"Cascadia Code", Consolas, monospace',
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    stack: '"JetBrains Mono", Consolas, monospace',
  },
  {
    id: "fira",
    label: "Fira Code",
    stack: '"Fira Code", Consolas, monospace',
  },
  {
    id: "source-code",
    label: "Source Code Pro",
    stack: '"Source Code Pro", Consolas, monospace',
  },
  {
    id: "ibm-plex",
    label: "IBM Plex Mono",
    stack: '"IBM Plex Mono", Consolas, monospace',
  },
]

const resolveFontOption = (family?: string) => {
  const normalized = family?.trim()
  if (!normalized) {
    return FONT_OPTIONS[0]
  }
  return (
    FONT_OPTIONS.find((option) => option.id === normalized || option.stack === normalized) ?? FONT_OPTIONS[0]
  )
}

const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
]

const THEME_COLOR_OPTIONS: Array<{ value: ThemeColor; label: string; swatch: string }> = [
  { value: "blue", label: "天空蓝", swatch: "bg-sky-500" },
  { value: "purple", label: "雾紫", swatch: "bg-violet-500" },
  { value: "cyan", label: "青空", swatch: "bg-cyan-500" },
]

const SettingsPage = () => {
  const navigate = useNavigate()
  const { config, updateSettings, updateWorkspaceConfig, updateUiState } = useWorkspaceStore()
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["key"]>("general")
  const [pathDialog, setPathDialog] = useState<{ field: PathField; value: string } | null>(null)
  const [appPaths, setAppPaths] = useState<AppPaths | null>(null)
  const settings = config?.settings ?? defaultSettings
  const activeMeta = sections.find((section) => section.key === activeSection) ?? sections[0]

  useEffect(() => {
    void getAppPaths()
      .then(setAppPaths)
      .catch(() => setAppPaths(null))
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pathDialog) {
        event.preventDefault()
        navigate("/")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate, pathDialog])

  const goBackToWorkspace = () => {
    navigate("/")
  }

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

  const handleOpenDirectory = async (path?: string | null) => {
    if (path) {
      await revealItemInDir(path)
    }
  }

  const handleRestoreDefaults = async () => {
    const defaults = await getDefaultWorkspacePaths()
    await updateWorkspaceConfig({ notesPath: defaults.notesPath, assetsPath: defaults.assetsPath })
  }

  const matchedFont = resolveFontOption(settings.editorFontFamily)
  const fontSelectValue = matchedFont.id

  return (
    <div className="settings-shell flex h-full flex-col overflow-hidden animate-in fade-in duration-200">
      <header className="flex h-11 shrink-0 items-stretch border-b border-border/30 bg-background/40 backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center px-3" data-tauri-drag-region>
          <span className="text-[13px] font-medium text-muted-foreground">设置</span>
          <span className="mx-1.5 text-muted-foreground/40">/</span>
          <span className="text-[13px] font-medium text-foreground/85">{activeMeta.label}</span>
        </div>
        <WindowControls />
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="settings-rail flex w-[232px] shrink-0 flex-col border-r border-border/30 bg-background/25 backdrop-blur-xl">
          <div className="p-2.5 pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start gap-2 rounded-xl px-2.5 text-[13px] font-medium text-foreground/85 transition-all duration-150 hover:bg-muted/70 active:scale-[0.99]"
              onClick={goBackToWorkspace}
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
              返回工作区
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-auto px-2.5 pb-4 pt-2">
            <div>
              <div className="mb-1 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground/70">
                个人
              </div>
              <div className="flex flex-col gap-0.5">
                {sections.map((section) => {
                  const Icon = section.icon
                  const active = activeSection === section.key
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-150",
                        active
                          ? "bg-muted/90 text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn("size-4 shrink-0", active ? "text-foreground" : "opacity-70")}
                        strokeWidth={1.75}
                      />
                      <span className="text-[13px] font-medium">{section.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        <main
          key={activeSection}
          className="settings-content min-w-0 flex-1 overflow-auto px-8 py-7 animate-in fade-in duration-200"
        >
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-6">
              <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground/95">
                {activeMeta.label}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{activeMeta.description}</p>
            </div>

          {activeSection === "general" ? (
            <div className="space-y-4">
              <SettingCard recommended title="启动时打开上次文件" description="下次启动自动恢复上次编辑的文档">
                <Switch
                  checked={settings.startWithLastFile}
                  onCheckedChange={(value) => updateSetting({ startWithLastFile: value })}
                />
              </SettingCard>
              <SettingCard recommended title="自动保存" description="编辑后自动写入本地文件">
                <Switch checked={settings.autoSave} onCheckedChange={(value) => updateSetting({ autoSave: value })} />
              </SettingCard>

              {settings.autoSave ? (
                <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
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
                <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
                  <div className="mb-2 text-sm font-medium">语言</div>
                  <Select
                    value={settings.language}
                    onChange={(event) => updateSetting({ language: event.target.value })}
                    options={[{ label: "简体中文", value: "zh-CN" }]}
                  />
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
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
          ) : null}

          {activeSection === "editor" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
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
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
                <div className="mb-2 text-sm font-medium">字体</div>
                <Select
                  value={fontSelectValue}
                  onChange={(event) => {
                    const next = resolveFontOption(event.target.value)
                    updateSetting({ editorFontFamily: next.stack })
                  }}
                  options={FONT_OPTIONS.map((option) => ({ label: option.label, value: option.id }))}
                />
                <div
                  className="mt-3 rounded-lg border border-border/40 bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground"
                  style={{ fontFamily: matchedFont.stack }}
                >
                  The quick brown fox 快速狐狸 0123456789
                </div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
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
              <SettingCard title="显示行号" description="编辑器左侧行号">
                <Switch
                  checked={settings.showLineNumbers}
                  onCheckedChange={(value) => updateSetting({ showLineNumbers: value })}
                />
              </SettingCard>
              <SettingCard title="自动换行" description="长行自动折行">
                <Switch checked={settings.wordWrap} onCheckedChange={(value) => updateSetting({ wordWrap: value })} />
              </SettingCard>
              <SettingCard title="代码高亮" description="预览区代码块着色">
                <Switch
                  checked={settings.codeHighlight}
                  onCheckedChange={(value) => updateSetting({ codeHighlight: value })}
                />
              </SettingCard>
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5 sm:col-span-2">
                <div className="mb-2 text-sm font-medium">代码高亮主题</div>
                <div className="mb-2 text-[12px] text-muted-foreground">预览区代码块配色（跟随外观或指定主题）</div>
                <Select
                  value={settings.codeHighlightTheme || "auto"}
                  onChange={(event) => updateSetting({ codeHighlightTheme: event.target.value })}
                  options={HIGHLIGHT_THEME_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.id,
                  }))}
                />
              </div>
              <SettingCard title="代码块行号" description="预览区代码块显示行号">
                <Switch
                  checked={settings.codeBlockLineNumbers ?? true}
                  onCheckedChange={(value) => updateSetting({ codeBlockLineNumbers: value })}
                />
              </SettingCard>
              <SettingCard title="滚动联动" description="分屏时同步滚动编辑区与预览区">
                <Switch checked={settings.scrollSync} onCheckedChange={(value) => updateSetting({ scrollSync: value })} />
              </SettingCard>
              <SettingCard title="无效后缀确认" description="重命名为不受支持的后缀时弹出轻确认">
                <Switch
                  checked={settings.confirmInvalidExtension ?? true}
                  onCheckedChange={(value) => updateSetting({ confirmInvalidExtension: value })}
                />
              </SettingCard>
            </div>
          ) : null}

          {activeSection === "appearance" ? (
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-sm font-medium">主题模式</div>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_MODE_OPTIONS.map((option) => {
                    const active = settings.themeMode === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSetting({ themeMode: option.value })}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-sm transition-all",
                          active
                            ? "border-primary/40 bg-primary/10 font-medium text-primary shadow-sm"
                            : "border-border/50 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">强调色</div>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_COLOR_OPTIONS.map((option) => {
                    const active = settings.themeColor === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSetting({ themeColor: option.value })}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm transition-all",
                          active
                            ? "border-primary/40 bg-primary/10 font-medium text-foreground shadow-sm"
                            : "border-border/50 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        <span className={cn("size-3.5 rounded-full ring-2 ring-background", option.swatch)} />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === "files" ? (
            <div className="space-y-3">
              <PathCard
                title="笔记目录"
                description="Markdown / TXT 文件存放位置"
                path={config?.notesPath}
                onEdit={() => openPathDialog("notesPath")}
                onOpen={() => void handleOpenDirectory(config?.notesPath)}
              />
              <PathCard
                title="资源目录"
                description="图片与附件存放位置（assets）"
                path={config?.assetsPath}
                onEdit={() => openPathDialog("assetsPath")}
                onOpen={() => void handleOpenDirectory(config?.assetsPath)}
              />
              <PathCard
                title="配置与记忆文件"
                description="窗口尺寸、标签、大纲、阅读位置等本地配置"
                path={appPaths?.configPath}
                onOpen={() => void handleOpenDirectory(appPaths?.configPath)}
              />
              <Button variant="secondary" size="sm" className="rounded-full" onClick={() => void handleRestoreDefaults()}>
                <RotateCcw className="mr-1.5 size-3.5" />
                恢复默认笔记 / 资源路径
              </Button>
            </div>
          ) : null}

          {activeSection === "shortcuts" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3.5">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  以下为当前版本已启用的快捷键，仅供查看，暂不支持自定义。编辑器相关快捷键需在编辑区聚焦时生效。
                </p>
              </div>
              {APP_SHORTCUTS.map((group) => (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-2xl border border-border/50 bg-background/60"
                >
                  <div className="border-b border-border/40 px-4 py-3">
                    <div className="text-sm font-medium">{group.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{group.description}</div>
                  </div>
                  <ul className="divide-y divide-border/35">
                    {group.items.map((item) => (
                      <li
                        key={`${group.id}-${item.keys.join("-")}-${item.action}`}
                        className="flex items-center justify-between gap-4 px-4 py-2.5"
                      >
                        <span className="min-w-0 text-[13px] text-foreground/85">{item.action}</span>
                        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                          {item.keys.map((key, index) => (
                            <span key={`${key}-${index}`} className="inline-flex items-center gap-1">
                              {index > 0 ? (
                                <span className="px-0.5 text-[11px] text-muted-foreground/70">+</span>
                              ) : null}
                              <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground/80 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_80%,transparent)]">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {activeSection === "about" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-background/60 p-6">
                <div className="flex items-center gap-3">
                  <CaelumLogo className="size-12 text-primary" />
                  <div>
                    <div className="text-xl font-semibold tracking-tight">Caelum</div>
                    <div className="text-sm text-muted-foreground">本地优先的 Markdown 笔记应用</div>
                  </div>
                </div>
                <Separator className="my-5" />
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">版本</dt>
                    <dd className="font-medium">v{APP_VERSION}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">协议</dt>
                    <dd className="font-medium">MIT</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">作者</dt>
                    <dd className="font-medium">North</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/60 p-5">
                <h3 className="text-sm font-semibold tracking-tight">功能说明</h3>
                <p className="mt-1 text-xs text-muted-foreground">Caelum 当前提供的核心能力</p>
                <ul className="mt-3 space-y-2">
                  {APP_FEATURES.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/60 p-5">
                <h3 className="text-sm font-semibold tracking-tight">更新说明</h3>
                <p className="mt-1 text-xs text-muted-foreground">版本变更与改进记录</p>
                <div className="mt-4 space-y-4">
                  {APP_CHANGELOG.map((entry) => (
                    <div key={entry.version} className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <div className="text-sm font-medium">v{entry.version}</div>
                        <div className="text-[11px] text-muted-foreground">{entry.date}</div>
                      </div>
                      <ul className="space-y-1.5">
                        {entry.notes.map((note) => (
                          <li key={note} className="flex gap-2 text-[13px] leading-relaxed text-foreground/80">
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </main>
      </div>

      <InputDialog
        open={pathDialog !== null}
        title="修改路径"
        description="请输入新的绝对路径"
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

const SettingCard = ({
  title,
  description,
  recommended,
  children,
}: {
  title: string
  description: string
  recommended?: boolean
  children: React.ReactNode
}) => (
  <label
    className={cn(
      "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 backdrop-blur-md transition-colors duration-150",
      recommended
        ? "border-border/50 bg-background/55"
        : "border-border/40 bg-background/45 hover:bg-background/60"
    )}
  >
    <div>
      <div className="flex items-center gap-2 text-sm font-medium">
        {title}
        {recommended ? (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            推荐
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </div>
    {children}
  </label>
)

const PathCard = ({
  title,
  description,
  path,
  onEdit,
  onOpen,
}: {
  title: string
  description: string
  path?: string | null
  onEdit?: () => void
  onOpen?: () => void
}) => (
  <div className="rounded-2xl border border-border/40 bg-background/45 p-4 backdrop-blur-md">
    <div className="mb-0.5 text-sm font-medium">{title}</div>
    <div className="mb-2 text-xs text-muted-foreground">{description}</div>
    <div className="mb-3 break-all rounded-xl bg-muted/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground/80">
      {path || "未加载"}
    </div>
    <div className="flex gap-2">
      {onEdit ? (
        <Button variant="outline" size="sm" className="rounded-full bg-background/50" onClick={onEdit}>
          修改路径
        </Button>
      ) : null}
      {onOpen ? (
        <Button variant="outline" size="sm" className="rounded-full bg-background/50" onClick={onOpen}>
          打开位置
        </Button>
      ) : null}
    </div>
  </div>
)

export default SettingsPage
