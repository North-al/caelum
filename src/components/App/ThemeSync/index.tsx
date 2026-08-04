import { useEffect } from "react"

import githubDarkHref from "highlight.js/styles/github-dark.css?url"
import githubLightHref from "highlight.js/styles/github.css?url"

import { useWorkspaceStore } from "~/store/workspace"

const themeClassMap = {
  blue: "theme-blue",
  purple: "theme-purple",
  cyan: "theme-cyan",
} as const

const HLJS_THEME_LINK_ID = "caelum-hljs-theme"

const ensureHljsThemeLink = () => {
  let link = document.getElementById(HLJS_THEME_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement("link")
    link.id = HLJS_THEME_LINK_ID
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }
  return link
}

export const ThemeSync = () => {
  const config = useWorkspaceStore((state) => state.config)

  useEffect(() => {
    const root = document.documentElement
    const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = () => {
      const settings = config?.settings
      const themeMode = settings?.themeMode ?? "system"
      const themeColor = settings?.themeColor ?? "blue"
      const isDark = themeMode === "dark" || (themeMode === "system" && systemDarkQuery.matches)

      root.classList.remove("dark", "theme-blue", "theme-purple", "theme-cyan")
      root.classList.add(themeClassMap[themeColor])

      if (isDark) {
        root.classList.add("dark")
      }

      // Swap official highlight.js themes — do not hand-roll token colors.
      ensureHljsThemeLink().href = isDark ? githubDarkHref : githubLightHref
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
