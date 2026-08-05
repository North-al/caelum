/** Curated highlight.js themes for preview code blocks. */
import a11yDark from "highlight.js/styles/a11y-dark.css?url"
import a11yLight from "highlight.js/styles/a11y-light.css?url"
import atomOneDark from "highlight.js/styles/atom-one-dark.css?url"
import atomOneLight from "highlight.js/styles/atom-one-light.css?url"
import github from "highlight.js/styles/github.css?url"
import githubDark from "highlight.js/styles/github-dark.css?url"
import githubDarkDimmed from "highlight.js/styles/github-dark-dimmed.css?url"
import monokai from "highlight.js/styles/monokai.css?url"
import monokaiSublime from "highlight.js/styles/monokai-sublime.css?url"
import nightOwl from "highlight.js/styles/night-owl.css?url"
import nord from "highlight.js/styles/nord.css?url"
import tokyoNightDark from "highlight.js/styles/tokyo-night-dark.css?url"
import vs2015 from "highlight.js/styles/vs2015.css?url"
import xcode from "highlight.js/styles/xcode.css?url"

export type HighlightThemeId =
  | "auto"
  | "github"
  | "github-dark"
  | "github-dark-dimmed"
  | "atom-one-light"
  | "atom-one-dark"
  | "a11y-light"
  | "a11y-dark"
  | "monokai"
  | "monokai-sublime"
  | "night-owl"
  | "nord"
  | "tokyo-night-dark"
  | "vs2015"
  | "xcode"

export const HIGHLIGHT_THEME_OPTIONS: Array<{ id: HighlightThemeId; label: string; dark?: boolean }> = [
  { id: "auto", label: "跟随外观" },
  { id: "github", label: "GitHub Light", dark: false },
  { id: "github-dark", label: "GitHub Dark", dark: true },
  { id: "github-dark-dimmed", label: "GitHub Dimmed", dark: true },
  { id: "atom-one-light", label: "Atom One Light", dark: false },
  { id: "atom-one-dark", label: "Atom One Dark", dark: true },
  { id: "a11y-light", label: "A11y Light", dark: false },
  { id: "a11y-dark", label: "A11y Dark", dark: true },
  { id: "monokai", label: "Monokai", dark: true },
  { id: "monokai-sublime", label: "Monokai Sublime", dark: true },
  { id: "night-owl", label: "Night Owl", dark: true },
  { id: "nord", label: "Nord", dark: true },
  { id: "tokyo-night-dark", label: "Tokyo Night", dark: true },
  { id: "vs2015", label: "Visual Studio Dark", dark: true },
  { id: "xcode", label: "Xcode", dark: false },
]

const THEME_HREF: Record<Exclude<HighlightThemeId, "auto">, string> = {
  github,
  "github-dark": githubDark,
  "github-dark-dimmed": githubDarkDimmed,
  "atom-one-light": atomOneLight,
  "atom-one-dark": atomOneDark,
  "a11y-light": a11yLight,
  "a11y-dark": a11yDark,
  monokai,
  "monokai-sublime": monokaiSublime,
  "night-owl": nightOwl,
  nord,
  "tokyo-night-dark": tokyoNightDark,
  vs2015,
  xcode,
}

export const resolveHighlightThemeHref = (themeId: string | undefined, isDark: boolean): string => {
  if (!themeId || themeId === "auto") {
    return isDark ? githubDark : github
  }
  return THEME_HREF[themeId as Exclude<HighlightThemeId, "auto">] ?? (isDark ? githubDark : github)
}
