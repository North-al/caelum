import type { CSSProperties } from "react"

import type { ScratchColor, ScratchNote } from "~/lib/scratch"
import type { ScratchSurfaceId } from "~/lib/scratch-surfaces"
import { resolveSurface } from "~/lib/scratch-surfaces"

/** Five curated styles — default matches Caelum app theme. */
export type ScratchPresetId = "caelum" | "frost-glass" | "neon-tech" | "parchment" | "aurora"

export type ScratchPatternId =
  | "none"
  | "plain"
  | "grid"
  | "lined"
  | "dots"
  | "gingham"
  | "graph"

export interface ScratchAppearance {
  preset: ScratchPresetId | "custom"
  background: string
  opacity: number
  blur: number
  borderColor: string
  borderWidth: number
  radius: number
  pinColor: string
  pattern: ScratchPatternId
  surfaceId: ScratchSurfaceId
}

export const SCRATCH_PATTERN_ORDER: ScratchPatternId[] = [
  "plain",
  "lined",
  "grid",
  "dots",
  "graph",
]

export const SCRATCH_PATTERN_LABELS: Record<ScratchPatternId, string> = {
  none: "无纹理",
  plain: "纯色",
  lined: "横线",
  grid: "方格",
  dots: "波点",
  gingham: "格纹",
  graph: "点阵",
}

export const SCRATCH_PRESET_ORDER: ScratchPresetId[] = [
  "caelum",
  "frost-glass",
  "neon-tech",
  "parchment",
  "aurora",
]

export const SCRATCH_PRESETS: Record<ScratchPresetId, ScratchAppearance> = {
  caelum: {
    preset: "caelum",
    background: "#f4f7fc",
    opacity: 0.94,
    blur: 12,
    borderColor: "#8ba8d8",
    borderWidth: 0,
    radius: 10,
    pinColor: "#5c84cc",
    pattern: "plain",
    surfaceId: "caelum-mica",
  },
  "frost-glass": {
    preset: "frost-glass",
    background: "#f0f6fc",
    opacity: 0.48,
    blur: 32,
    borderColor: "#b8d4ec",
    borderWidth: 0,
    radius: 10,
    pinColor: "#5c84cc",
    pattern: "plain",
    surfaceId: "none",
  },
  "neon-tech": {
    preset: "neon-tech",
    background: "#1a2230",
    opacity: 0.72,
    blur: 16,
    borderColor: "#4a9cf0",
    borderWidth: 0,
    radius: 8,
    pinColor: "#6eb8ff",
    pattern: "graph",
    surfaceId: "neon-grid",
  },
  parchment: {
    preset: "parchment",
    background: "#f6f0e6",
    opacity: 0.96,
    blur: 0,
    borderColor: "#c8b8a0",
    borderWidth: 0,
    radius: 10,
    pinColor: "#a88860",
    pattern: "lined",
    surfaceId: "parchment-fiber",
  },
  aurora: {
    preset: "aurora",
    background: "#f5f8ff",
    opacity: 0.92,
    blur: 6,
    borderColor: "#b8c8e8",
    borderWidth: 0,
    radius: 12,
    pinColor: "#7c8ce8",
    pattern: "plain",
    surfaceId: "aurora-wash",
  },
}

export const SCRATCH_PRESET_LABELS: Record<ScratchPresetId | "custom", string> = {
  caelum: "天青主题",
  "frost-glass": "毛玻璃",
  "neon-tech": "未来科技",
  parchment: "羊皮纸",
  aurora: "极光柔和",
  custom: "自定义",
}

export const SCRATCH_PRESET_DESC: Record<ScratchPresetId, string> = {
  caelum: "与 Caelum 主色一致，默认推荐",
  "frost-glass": "高透毛玻璃，适合叠在桌面上",
  "neon-tech": "深色霓虹网格，科技感",
  parchment: "温暖纸感，适合长文记录",
  aurora: "柔和渐变底，轻盈不抢眼",
}

const LEGACY_COLOR_PRESET: Record<ScratchColor, ScratchPresetId> = {
  ivory: "caelum",
  fog: "caelum",
  sage: "parchment",
  blush: "aurora",
  lemon: "parchment",
}

const LEGACY_PRESET_MAP: Record<string, ScratchPresetId> = {
  caelum: "caelum",
  glass: "frost-glass",
  "frost-glass": "frost-glass",
  "neon-tech": "neon-tech",
  "ink-glass": "neon-tech",
  parchment: "parchment",
  "peach-grid": "parchment",
  "tape-kraft": "parchment",
  "mint-clean": "parchment",
  aurora: "aurora",
  "cream-gingham": "aurora",
  "dot-play": "aurora",
  "fog-lined": "caelum",
  "bear-journal": "parchment",
  "glass-cyan": "frost-glass",
  lemon: "parchment",
  mint: "parchment",
  fog: "caelum",
  ivory: "caelum",
  blush: "aurora",
  ink: "neon-tech",
}

export const colorForPreset = (preset: ScratchPresetId | "custom"): ScratchColor => {
  if (preset === "parchment") {
    return "lemon"
  }
  if (preset === "neon-tech") {
    return "fog"
  }
  if (preset === "aurora") {
    return "blush"
  }
  if (preset === "frost-glass" || preset === "caelum") {
    return "fog"
  }
  return "ivory"
}

export const parseHex = (hex: string) => {
  let value = hex.replace("#", "").trim()
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("")
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 255, g: 253, b: 246 }
  }
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

export const hexToRgba = (hex: string, opacity: number) => {
  const { r, g, b } = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0.08, opacity))})`
}

export const inkForBackground = (hex: string) => {
  const { r, g, b } = parseHex(hex)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma < 0.48 ? "#f4f6f9" : "#2a3140"
}

export const resolveTextInk = (background: string, surfaceTextInk?: string) => {
  if (surfaceTextInk) {
    return surfaceTextInk
  }
  return inkForBackground(background)
}

export const isDarkAppearance = (background: string, ink: string) => {
  if (ink === "#f4f6f9" || ink === "#e8f4ff") {
    return true
  }
  const { r, g, b } = parseHex(background)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45
}

const patternLayer = (pattern: ScratchPatternId, accent: string, ink: string) => {
  const line = colorMix(accent, 20)
  const dot = colorMix(accent, 26)
  const faint = colorMix(ink, 8)

  switch (pattern) {
    case "grid":
      return `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`
    case "lined":
      return `repeating-linear-gradient(180deg, transparent 0, transparent 23px, ${line} 23px, ${line} 24px)`
    case "dots":
      return `radial-gradient(${dot} 1.5px, transparent 1.6px)`
    case "gingham":
      return `linear-gradient(45deg, ${line} 25%, transparent 25%, transparent 75%, ${line} 75%), linear-gradient(-45deg, ${line} 25%, transparent 25%, transparent 75%, ${line} 75%)`
    case "graph":
      return `radial-gradient(${faint} 1px, transparent 1px)`
    case "plain":
    case "none":
    default:
      return "none"
  }
}

const patternSize = (pattern: ScratchPatternId) => {
  switch (pattern) {
    case "grid":
      return "18px 18px, 18px 18px"
    case "lined":
      return "auto"
    case "dots":
      return "14px 14px"
    case "gingham":
      return "12px 12px, 12px 12px"
    case "graph":
      return "16px 16px"
    default:
      return "auto"
  }
}

function colorMix(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

export const normalizeAppearance = (
  raw: Partial<ScratchAppearance> & { preset?: ScratchAppearance["preset"] }
): ScratchAppearance => {
  const legacyPreset = raw.preset && LEGACY_PRESET_MAP[raw.preset]
  const preset = (legacyPreset ?? raw.preset ?? "caelum") as ScratchPresetId | "custom"
  const base =
    preset !== "custom" && SCRATCH_PRESETS[preset as ScratchPresetId]
      ? SCRATCH_PRESETS[preset as ScratchPresetId]
      : SCRATCH_PRESETS.caelum

  const surfaceId = (raw.surfaceId ?? base.surfaceId ?? "none") as ScratchSurfaceId
  const surface = resolveSurface(surfaceId)
  const hasSurfaceArt = surfaceId !== "none" && Boolean(surface.backgroundImage)
  const pattern = hasSurfaceArt
    ? "plain"
    : (raw.pattern ?? base.pattern)

  return {
    preset,
    background: raw.background ?? surface.fallbackBackground ?? base.background,
    opacity: raw.opacity ?? base.opacity,
    blur: raw.blur ?? base.blur,
    borderColor: raw.borderColor ?? base.borderColor,
    borderWidth: raw.borderWidth ?? base.borderWidth,
    radius: Math.min(raw.radius ?? base.radius, 16),
    pinColor: raw.pinColor ?? base.pinColor,
    pattern,
    surfaceId,
  }
}

export const appearanceFromLegacyColor = (color: ScratchColor): ScratchAppearance => {
  return { ...SCRATCH_PRESETS[LEGACY_COLOR_PRESET[color] ?? "caelum"] }
}

export const resolveAppearance = (note: Pick<ScratchNote, "color" | "appearance">): ScratchAppearance => {
  if (note.appearance) {
    const legacy = note.appearance.preset && LEGACY_PRESET_MAP[note.appearance.preset]
    const preset = (legacy ?? note.appearance.preset) as ScratchPresetId | "custom"
    const base =
      preset !== "custom" && SCRATCH_PRESETS[preset as ScratchPresetId]
        ? SCRATCH_PRESETS[preset as ScratchPresetId]
        : SCRATCH_PRESETS.caelum
    return normalizeAppearance({ ...base, ...note.appearance, preset })
  }
  return appearanceFromLegacyColor(note.color)
}

export const withResolvedAppearance = (note: ScratchNote): ScratchNote => ({
  ...note,
  appearance: resolveAppearance(note),
})

export const appearanceStyle = (appearance: ScratchAppearance): CSSProperties => {
  const surface = resolveSurface(appearance.surfaceId)
  const paneBg = hexToRgba(appearance.background, appearance.opacity)
  const blurPx = appearance.blur > 0.4 ? appearance.blur : 0
  const ink = resolveTextInk(appearance.background, surface.textInk)
  const muted =
    ink === "#f4f6f9" || ink === "#e8f4ff"
      ? "rgba(232, 240, 255, 0.68)"
      : "rgba(36, 48, 68, 0.52)"
  const hasSurfaceArt = appearance.surfaceId !== "none" && Boolean(surface.backgroundImage)
  const pattern = hasSurfaceArt
    ? "plain"
    : appearance.pattern === "none"
      ? "plain"
      : appearance.pattern
  const patternImage = patternLayer(pattern, appearance.borderColor, ink)
  const dark = isDarkAppearance(appearance.background, ink)

  return {
    backgroundColor: paneBg,
    backdropFilter: blurPx > 0 ? `blur(${blurPx}px) saturate(1.22)` : undefined,
    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px) saturate(1.22)` : undefined,
    border: "none",
    borderRadius: appearance.radius,
    boxShadow: dark
      ? "0 16px 40px -18px rgba(0, 0, 0, 0.45)"
      : "0 16px 40px -18px rgba(40, 60, 90, 0.16)",
    color: ink,
    ["--scratch-pane-bg" as string]: paneBg,
    ["--scratch-ink" as string]: ink,
    ["--scratch-muted" as string]: muted,
    ["--scratch-accent" as string]: appearance.borderColor,
    ["--scratch-pin" as string]: appearance.pinColor,
    ["--scratch-radius" as string]: `${appearance.radius}px`,
    ["--scratch-pattern-image" as string]: patternImage,
    ["--scratch-pattern-size" as string]: patternSize(pattern),
    ["--glass-pane-bg" as string]: paneBg,
    ["--glass-ink" as string]: ink,
    ["--glass-muted" as string]: muted,
    ["--glass-accent" as string]: appearance.borderColor,
    ["--glass-row-active" as string]: dark
      ? `color-mix(in srgb, ${appearance.borderColor} 22%, rgba(255, 255, 255, 0.12))`
      : `color-mix(in srgb, ${appearance.borderColor} 28%, rgba(255, 255, 255, 0.55))`,
    ["--paper-ink" as string]: ink,
    ["--paper-muted" as string]: muted,
    ["--pin-color" as string]: appearance.pinColor,
    ["--accent-chip" as string]: appearance.borderColor,
    ["--pane-radius" as string]: `${appearance.radius}px`,
  }
}

export const appearanceTone = (appearance: ScratchAppearance) => {
  const surface = resolveSurface(appearance.surfaceId)
  const ink = resolveTextInk(appearance.background, surface.textInk)
  return isDarkAppearance(appearance.background, ink) ? "dark" : "light"
}

export const appearanceClassNames = () => ({
  root: "",
  face: "",
})

/** Mini preview style for preset cards in the settings panel. */
export const presetPreviewStyle = (preset: ScratchAppearance): CSSProperties => {
  const style = appearanceStyle(preset)
  return {
    ...style,
    borderRadius: 8,
    minHeight: 56,
    borderWidth: 0,
  }
}

export const patternPreviewStyle = (
  pattern: ScratchPatternId,
  background: string,
  accent: string
): CSSProperties => {
  const ink = inkForBackground(background)
  const id = pattern === "none" ? "plain" : pattern
  return {
    backgroundColor: background,
    backgroundImage: patternLayer(id, accent, ink),
    backgroundSize: patternSize(id),
    backgroundPosition: "center",
  }
}
