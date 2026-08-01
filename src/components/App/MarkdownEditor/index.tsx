import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { useWorkspaceStore } from "~/store/workspace"

interface Props {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  onCreateEditor?: (view: EditorView) => void
}

export const MarkdownEditor = ({ value, onChange, readOnly = false, onCreateEditor }: Props) => {
  const { config } = useWorkspaceStore()
  const settings = config?.settings

  return (
    <div className="h-full overflow-hidden rounded-xl bg-background/60">
      <CodeMirror
        value={value}
        height="100%"
        extensions={[markdown(), EditorView.lineWrapping, EditorState.tabSize.of(settings?.tabSize ?? 2)]}
        theme={settings?.themeMode === "light" ? undefined : oneDark}
        basicSetup={{
          lineNumbers: settings?.showLineNumbers ?? true,
          foldGutter: false,
          autocompletion: false,
          indentOnInput: true,
        }}
        readOnly={readOnly}
        onChange={onChange}
        onCreateEditor={(view) => onCreateEditor?.(view)}
        className="h-full"
        style={{ fontSize: `${settings?.editorFontSize ?? 14}px`, fontFamily: settings?.editorFontFamily ?? "Inter Variable" }}
      />
    </div>
  )
}
