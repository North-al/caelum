import type { Command } from "@codemirror/view"
import { EditorView as CMView } from "@codemirror/view"
import { EditorSelection } from "@codemirror/state"

import {
  attachPanelDrag,
  defaultCenteredPosition,
  resolvePanelPosition,
  type PanelPosition,
} from "~/lib/floating-panel"
import { useWorkspaceStore } from "~/store/workspace"

const PANEL_CLASS = "caelum-goto-panel"

const removeExisting = () => {
  document.querySelectorAll(`.${PANEL_CLASS}`).forEach((node) => node.remove())
}

const parseGotoInput = (raw: string, currentLine: number, totalLines: number) => {
  const value = raw.trim().replace(/^:+/, "")
  const match = /^([+-])?(\d+)?(?::(\d+))?(%)?$/.exec(value)
  if (!match) {
    return null
  }
  const [, sign, ln, colRaw, percent] = match
  const col = colRaw ? Number(colRaw) : 0
  let line = ln ? Number(ln) : currentLine
  if (ln && percent) {
    let pc = line / 100
    if (sign) {
      pc = pc * (sign === "-" ? -1 : 1) + currentLine / totalLines
    }
    line = Math.round(totalLines * pc)
  } else if (ln && sign) {
    line = line * (sign === "-" ? -1 : 1) + currentLine
  }
  line = Math.max(1, Math.min(totalLines, line || currentLine))
  return { line, col: Math.max(0, col) }
}

const updateHint = (
  hint: HTMLElement,
  line: number,
  col: number,
  totalLines: number,
  inputValue: string
) => {
  const parsed = parseGotoInput(inputValue, line, totalLines)
  const rangeText = `请输入 1 到 ${totalLines} 之间的行号以跳转`
  if (!parsed && inputValue.replace(/^:+/, "").trim() !== "") {
    hint.textContent = `当前行：${line}，字符：${col}。${rangeText}。`
    hint.dataset.invalid = "true"
    return
  }
  hint.dataset.invalid = "false"
  hint.textContent = `当前行：${line}，字符：${col}。${rangeText}。`
}

const applyPosition = (panel: HTMLElement, pos: PanelPosition) => {
  panel.style.left = `${pos.left}px`
  panel.style.top = `${pos.top}px`
  panel.style.transform = "none"
}

/** Open a VS Code–style go-to-line panel (Chinese copy). Bound to Ctrl+G. */
export const openGotoLinePanel: Command = (view) => {
  removeExisting()

  const state = view.state
  const head = state.selection.main.head
  const current = state.doc.lineAt(head)
  const totalLines = state.doc.lines
  const currentCol = head - current.from + 1

  const panel = document.createElement("div")
  panel.className = PANEL_CLASS
  panel.setAttribute("role", "dialog")
  panel.setAttribute("aria-label", "跳转到行")

  const handle = document.createElement("div")
  handle.className = "caelum-goto-drag"
  handle.title = "拖动移动"
  handle.innerHTML = `<span class="caelum-goto-drag-grip" aria-hidden="true"></span><span>跳转到行</span>`

  const field = document.createElement("div")
  field.className = "caelum-goto-field"

  const input = document.createElement("input")
  input.type = "text"
  input.className = "caelum-goto-input"
  input.value = ":"
  input.setAttribute("aria-label", "行号")
  input.setAttribute("data-no-drag", "true")
  input.spellcheck = false
  input.autocomplete = "off"

  const hint = document.createElement("div")
  hint.className = "caelum-goto-hint"
  updateHint(hint, current.number, currentCol, totalLines, ":")

  field.appendChild(input)
  panel.appendChild(handle)
  panel.appendChild(field)
  panel.appendChild(hint)
  document.body.appendChild(panel)

  const size = { width: panel.offsetWidth || 420, height: panel.offsetHeight || 96 }
  const stored = useWorkspaceStore.getState().config?.uiState.gotoPanelPosition
  const pos = resolvePanelPosition(stored, size, () =>
    defaultCenteredPosition(size.width, size.height, 0.38)
  )
  applyPosition(panel, pos)

  let detachDrag = () => undefined as void
  detachDrag = attachPanelDrag(
    panel,
    handle,
    () => undefined,
    (next) => {
      void useWorkspaceStore.getState().updateUiState({ gotoPanelPosition: next })
    }
  )

  const onReposition = () => {
    const rect = panel.getBoundingClientRect()
    const next = resolvePanelPosition(
      { left: rect.left, top: rect.top },
      { width: rect.width, height: rect.height },
      () => defaultCenteredPosition(rect.width, rect.height, 0.38)
    )
    applyPosition(panel, next)
  }
  window.addEventListener("resize", onReposition)

  const close = () => {
    detachDrag()
    window.removeEventListener("resize", onReposition)
    window.removeEventListener("mousedown", onPointerDown, true)
    panel.remove()
    view.focus()
  }

  const go = () => {
    const parsed = parseGotoInput(input.value, current.number, view.state.doc.lines)
    if (!parsed) {
      updateHint(hint, current.number, currentCol, view.state.doc.lines, input.value)
      return
    }
    const docLine = view.state.doc.line(parsed.line)
    const selection = EditorSelection.cursor(
      docLine.from + Math.max(0, Math.min(parsed.col, docLine.length))
    )
    view.dispatch({
      selection,
      effects: [CMView.scrollIntoView(selection.from, { y: "center" })],
    })
    close()
  }

  input.addEventListener("input", () => {
    updateHint(hint, current.number, currentCol, view.state.doc.lines, input.value)
  })

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      go()
    } else if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  })

  const onPointerDown = (event: MouseEvent) => {
    if (!panel.contains(event.target as Node)) {
      close()
    }
  }
  window.setTimeout(() => {
    window.addEventListener("mousedown", onPointerDown, true)
  }, 0)

  panel.addEventListener("mousedown", (event) => event.stopPropagation())

  requestAnimationFrame(() => {
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  })

  return true
}
