import { useEffect } from "react"

import { useWorkspaceStore } from "~/store/workspace"

const themeClassMap = {
  blue: "theme-blue",
  purple: "theme-purple",
  cyan: "theme-cyan",
} as const

export const ThemeSync = () => {
  const config = useWorkspaceStore((state) => state.config)

  useEffect(() => {
    const root = document.documentElement
    const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = () => {
      const settings = config?.settings
      const themeMode = settings?.themeMode ?? "system"
      const themeColor = settings?.themeColor ?? "blue"

      root.classList.remove("dark", "theme-blue", "theme-purple", "theme-cyan")
      root.classList.add(themeClassMap[themeColor])

      if (themeMode === "dark" || (themeMode === "system" && systemDarkQuery.matches)) {
        root.classList.add("dark")
      }
    }

    applyTheme()

    const handleSystemThemeChange = () => {
      if ((config?.settings.themeMode ?? "system") === "system") {
        applyTheme()
      }
    }

    systemDarkQuery.addEventListener("change", handleSystemThemeChange)
    return () => systemDarkQuery.removeEventListener("change", handleSystemThemeChange)
  }, [config])

  return null
}
