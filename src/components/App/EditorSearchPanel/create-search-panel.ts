import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  replaceAll,
  replaceNext,
  searchPanelOpen,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search"
import type { Command, EditorView, Panel, ViewUpdate } from "@codemirror/view"
import { Replace, ReplaceAll } from "lucide-react"

const lucideSvg = (Icon: typeof Replace, size = 14) =>
  renderToStaticMarkup(
    createElement(Icon, {
      size,
      strokeWidth: 2,
      "aria-hidden": true,
      className: "caelum-search-lucide",
    })
  )

const iconBtn = (title: string, svg: string, className = "caelum-search-icon-btn") => {
  const button = document.createElement("button")
  button.type = "button"
  button.title = title
  button.setAttribute("aria-label", title)
  button.className = className
  button.innerHTML = svg
  return button
}

const toggleBtn = (title: string, label: string) => {
  const button = document.createElement("button")
  button.type = "button"
  button.title = title
  button.setAttribute("aria-label", title)
  button.className = "caelum-search-toggle"
  button.textContent = label
  button.setAttribute("aria-pressed", "false")
  return button
}

const CHEVRON_SVG = `<svg class="caelum-search-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>`
const REPLACE_SVG = lucideSvg(Replace)
const REPLACE_ALL_SVG = lucideSvg(ReplaceAll)

/** Expand replace row on next panel create (Ctrl+R). */
let pendingExpandReplace = false

const expandReplaceInDom = (root: ParentNode) => {
  const expandBtn = root.querySelector(".caelum-search-expand-btn") as HTMLButtonElement | null
  if (expandBtn && !expandBtn.classList.contains("is-expanded")) {
    expandBtn.click()
    return
  }
  const replaceInput = root.querySelector(
    ".caelum-search-replace-row .caelum-search-input"
  ) as HTMLInputElement | null
  replaceInput?.focus()
}

/** Open find panel with replace row expanded (Ctrl+R). */
export const openEditorReplacePanel: Command = (view) => {
  if (searchPanelOpen(view.state)) {
    expandReplaceInDom(view.dom)
    return true
  }
  pendingExpandReplace = true
  openSearchPanel(view)
  requestAnimationFrame(() => expandReplaceInDom(view.dom))
  return true
}

/** Cursor / VS Code style floating find & replace panel for CodeMirror 6. */
export const createEditorSearchPanel = (view: EditorView): Panel => {
  const dom = document.createElement("div")
  dom.className = "caelum-search-panel"

  let query = getSearchQuery(view.state)
  let replaceVisible = Boolean(query.replace) || pendingExpandReplace
  pendingExpandReplace = false

  const findInput = document.createElement("input")
  findInput.type = "text"
  findInput.placeholder = "查找"
  findInput.className = "caelum-search-input"
  findInput.setAttribute("main-field", "true")
  findInput.value = query.search

  const replaceInput = document.createElement("input")
  replaceInput.type = "text"
  replaceInput.placeholder = "替换"
  replaceInput.className = "caelum-search-input"
  replaceInput.value = query.replace

  const matchCount = document.createElement("span")
  matchCount.className = "caelum-search-count"
  matchCount.textContent = ""

  const caseBtn = toggleBtn("区分大小写", "Aa")
  const wordBtn = toggleBtn("全词匹配", "ab")
  const reBtn = toggleBtn("使用正则表达式", ".*")
  const preserveBtn = toggleBtn("保留大小写", "AB")

  const syncToggle = (button: HTMLButtonElement, on: boolean) => {
    button.setAttribute("aria-pressed", on ? "true" : "false")
    button.classList.toggle("is-active", on)
  }

  /** Update query / highlights only — never jump selection while typing (avoids input select). */
  const commit = () => {
    const next = new SearchQuery({
      search: findInput.value,
      replace: replaceInput.value,
      caseSensitive: caseBtn.getAttribute("aria-pressed") === "true",
      regexp: reBtn.getAttribute("aria-pressed") === "true",
      wholeWord: wordBtn.getAttribute("aria-pressed") === "true",
    })
    if (query.eq(next)) {
      return
    }
    query = next
    view.dispatch({ effects: setSearchQuery.of(next) })
    updateCount()
  }

  const updateCount = () => {
    const current = getSearchQuery(view.state)
    if (!current.search) {
      matchCount.textContent = ""
      return
    }
    try {
      let total = 0
      const cursor = current.getCursor(view.state)
      while (!cursor.next().done) {
        total += 1
        if (total > 999) {
          break
        }
      }
      matchCount.textContent = total === 0 ? "无结果" : total > 999 ? "999+" : `${total} 个结果`
    } catch {
      matchCount.textContent = "无效正则"
    }
  }

  syncToggle(caseBtn, query.caseSensitive)
  syncToggle(wordBtn, query.wholeWord)
  syncToggle(reBtn, query.regexp)

  const expandBtn = iconBtn("显示替换", CHEVRON_SVG, "caelum-search-icon-btn caelum-search-expand-btn")

  const prevBtn = iconBtn(
    "上一个匹配",
    `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>`
  )
  const nextBtn = iconBtn(
    "下一个匹配",
    `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`
  )
  const selectAllBtn = iconBtn(
    "选择全部匹配",
    `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 5h10M3 8h10M3 11h7"/></svg>`
  )
  const closeBtn = iconBtn(
    "关闭",
    `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`
  )
  const replaceOneBtn = iconBtn("替换", REPLACE_SVG)
  const replaceAllBtn = iconBtn("全部替换", REPLACE_ALL_SVG)

  const findRow = document.createElement("div")
  findRow.className = "caelum-search-row"

  const findField = document.createElement("div")
  findField.className = "caelum-search-field"
  findField.append(findInput, caseBtn, wordBtn, reBtn)

  const findActions = document.createElement("div")
  findActions.className = "caelum-search-actions caelum-search-find-actions"
  findActions.append(matchCount, prevBtn, nextBtn, selectAllBtn, closeBtn)

  findRow.append(expandBtn, findField, findActions)

  const replaceRow = document.createElement("div")
  replaceRow.className = "caelum-search-row caelum-search-replace-row"

  const replaceField = document.createElement("div")
  replaceField.className = "caelum-search-field"
  replaceField.append(replaceInput, preserveBtn)

  const replaceActions = document.createElement("div")
  replaceActions.className = "caelum-search-actions caelum-search-replace-actions"
  replaceActions.append(replaceOneBtn, replaceAllBtn)

  const replaceGutter = document.createElement("div")
  replaceGutter.className = "caelum-search-gutter"
  replaceGutter.setAttribute("aria-hidden", "true")

  replaceRow.append(replaceGutter, replaceField, replaceActions)

  const applyReplaceVisibility = () => {
    replaceRow.hidden = !replaceVisible
    expandBtn.classList.toggle("is-expanded", replaceVisible)
    expandBtn.title = replaceVisible ? "隐藏替换" : "显示替换"
    expandBtn.setAttribute("aria-label", expandBtn.title)
    expandBtn.setAttribute("aria-expanded", replaceVisible ? "true" : "false")
  }
  applyReplaceVisibility()

  dom.append(findRow, replaceRow)

  findInput.addEventListener("input", () => commit())
  replaceInput.addEventListener("input", () => commit())

  findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (event.shiftKey) {
        findPrevious(view)
      } else {
        findNext(view)
      }
      findInput.focus()
    } else if (event.key === "Escape") {
      event.preventDefault()
      closeSearchPanel(view)
    }
  })

  replaceInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      replaceNext(view)
      replaceInput.focus()
    } else if (event.key === "Escape") {
      event.preventDefault()
      closeSearchPanel(view)
    }
  })

  caseBtn.addEventListener("click", () => {
    syncToggle(caseBtn, caseBtn.getAttribute("aria-pressed") !== "true")
    commit()
  })
  wordBtn.addEventListener("click", () => {
    syncToggle(wordBtn, wordBtn.getAttribute("aria-pressed") !== "true")
    commit()
  })
  reBtn.addEventListener("click", () => {
    syncToggle(reBtn, reBtn.getAttribute("aria-pressed") !== "true")
    commit()
  })
  preserveBtn.addEventListener("click", () => {
    syncToggle(preserveBtn, preserveBtn.getAttribute("aria-pressed") !== "true")
  })

  expandBtn.addEventListener("click", () => {
    replaceVisible = !replaceVisible
    applyReplaceVisibility()
    if (replaceVisible) {
      replaceInput.focus()
    } else {
      findInput.focus()
    }
  })

  prevBtn.addEventListener("click", () => {
    findPrevious(view)
    findInput.focus()
  })
  nextBtn.addEventListener("click", () => {
    findNext(view)
    findInput.focus()
  })
  selectAllBtn.addEventListener("click", () => selectMatches(view))
  closeBtn.addEventListener("click", () => closeSearchPanel(view))
  replaceOneBtn.addEventListener("click", () => {
    replaceNext(view)
    replaceInput.focus()
  })
  replaceAllBtn.addEventListener("click", () => {
    replaceAll(view)
    replaceInput.focus()
  })

  updateCount()

  return {
    dom,
    top: true,
    mount() {
      if (replaceVisible) {
        replaceInput.focus()
        replaceInput.select()
      } else {
        findInput.focus()
        findInput.select()
      }
    },
    update(update: ViewUpdate) {
      const next = getSearchQuery(update.state)
      if (!next.eq(query)) {
        query = next
        if (document.activeElement !== findInput) {
          findInput.value = next.search
        }
        if (document.activeElement !== replaceInput) {
          replaceInput.value = next.replace
        }
        syncToggle(caseBtn, next.caseSensitive)
        syncToggle(wordBtn, next.wholeWord)
        syncToggle(reBtn, next.regexp)
      }
      updateCount()
    },
  }
}
