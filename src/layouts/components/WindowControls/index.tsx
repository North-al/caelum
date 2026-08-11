import { useEffect, useState } from "react"
import { Copy, Minus, Square, X } from "lucide-react"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { cn } from "~/lib/utils"

/** Linear window chrome buttons — flush to the window edge with Win11 corner radius. */
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

  const buttonClass = cn(
    "window-control-btn flex h-full w-11 items-center justify-center text-muted-foreground",
    "transition-[background-color,color,transform] duration-150",
    "hover:bg-accent hover:text-foreground",
    "active:scale-[0.94]"
  )

  return (
    <div className="flex h-full shrink-0 items-stretch self-stretch">
      <button
        type="button"
        className={buttonClass}
        title="最小化"
        aria-label="最小化"
        onClick={() => void handleMinimize()}
      >
        <Minus className="size-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        className={buttonClass}
        title={isMaximized ? "还原" : "最大化"}
        aria-label={isMaximized ? "还原" : "最大化"}
        onClick={() => void handleMaximize()}
      >
        {isMaximized ? (
          <Copy className="size-3 rotate-90" strokeWidth={1.6} />
        ) : (
          <Square className="size-3.5" strokeWidth={1.6} />
        )}
      </button>
      <button
        type="button"
        className={cn(
          buttonClass,
          "hover:bg-destructive hover:text-white",
          // Match Windows 11 DWM corner so hover fill doesn't leave a light gap.
          !isMaximized && "rounded-tr-[10px]"
        )}
        title="关闭"
        aria-label="关闭"
        onClick={() => void handleClose()}
      >
        <X className="size-3.5" strokeWidth={1.6} />
      </button>
    </div>
  )
}
