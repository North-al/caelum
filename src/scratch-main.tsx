import { Component, type ReactNode } from "react"
import ReactDOM from "react-dom/client"

import { ScratchShell } from "~/pages/ScratchPad"
import { setupStyles } from "./styles"

setupStyles()
document.documentElement.classList.add("scratch-note-window")

const readNoteId = () => {
  try {
    const queryId = new URLSearchParams(window.location.search).get("id")
    if (queryId) {
      return queryId
    }
  } catch {
    // ignore
  }

  if (window.__CAELUM_SCRATCH_ID__) {
    return window.__CAELUM_SCRATCH_ID__
  }

  return ""
}

class ScratchErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="scratch-float scratch-shell" data-color="ivory">
          <header className="flex h-9 shrink-0 items-center justify-end px-2" data-tauri-drag-region>
            <button
              type="button"
              className="size-7 rounded-md text-[18px] text-[color:var(--paper-muted)]"
              aria-label="关闭"
              onClick={() => window.__caelumCloseScratch?.()}
            >
              ×
            </button>
          </header>
          <textarea
            className="scratch-input min-h-0 flex-1 resize-none border-0 bg-transparent px-4 pb-4 text-[14px] leading-[1.65] outline-none"
            placeholder="此刻想到的…"
            autoFocus
          />
        </div>
      )
    }
    return this.props.children
  }
}

const noteId = readNoteId()
const root = document.getElementById("root")

if (root) {
  ReactDOM.createRoot(root).render(
    <ScratchErrorBoundary>
      <ScratchShell noteId={noteId} />
    </ScratchErrorBoundary>
  )
}
