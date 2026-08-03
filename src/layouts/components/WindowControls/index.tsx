import { useEffect, useState } from "react"
import { Copy, Maximize2, Minus, X } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { cn } from "~/lib/utils"

export const WindowControls = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const appWindow = getCurrentWindow()

    void appWindow.isMaximized().then(setIsMaximized)

    const unlistenPromise = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized())
    })

    return () => {
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [])

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow()
    await appWindow.toggleMaximize()
    setIsMaximized(await appWindow.isMaximized())
  }

  const handleMinimize = async () => {
    await getCurrentWindow().minimize()
  }

  const handleClose = async () => {
    await getCurrentWindow().close()
  }

  const buttonClass =
    "flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"

  return (
    <div className="flex h-full shrink-0 items-stretch">
      <button type="button" className={buttonClass} title="最小化" aria-label="最小化" onClick={() => void handleMinimize()}>
        <Minus className="size-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={buttonClass}
        title={isMaximized ? "还原" : "最大化"}
        aria-label={isMaximized ? "还原" : "最大化"}
        onClick={() => void handleMaximize()}
      >
        {isMaximized ? (
          <Copy className="size-3 rotate-90" strokeWidth={1.75} />
        ) : (
          <Maximize2 className="size-3" strokeWidth={1.75} />
        )}
      </button>
      <button
        type="button"
        className={cn(buttonClass, "hover:bg-destructive hover:text-white")}
        title="关闭"
        aria-label="关闭"
        onClick={() => void handleClose()}
      >
        <X className="size-3.5" strokeWidth={1.75} />
      </button>
    </div>
  )
}
