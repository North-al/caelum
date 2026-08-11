import type { MermaidThemeSetting } from "~/lib/workspace"

export type MermaidThemeId = "default" | "dark" | "forest" | "neutral" | "base"

export const MERMAID_THEME_OPTIONS: Array<{ id: MermaidThemeSetting; label: string }> = [
  { id: "auto", label: "跟随外观" },
  { id: "default", label: "Default" },
  { id: "dark", label: "Dark" },
  { id: "forest", label: "Forest" },
  { id: "neutral", label: "Neutral" },
  { id: "base", label: "Base" },
]

/** Resolve settings value to a concrete Mermaid theme id. */
export const resolveMermaidTheme = (
  setting: MermaidThemeSetting | undefined,
  isDark?: boolean
): MermaidThemeId => {
  if (!setting || setting === "auto") {
    if (typeof isDark === "boolean") {
      return isDark ? "dark" : "default"
    }
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return "dark"
    }
    return "default"
  }
  return setting
}
