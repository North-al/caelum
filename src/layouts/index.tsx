import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router"
import { listen } from "@tauri-apps/api/event"
import { TooltipProvider } from "~/components/ui/tooltip"
import { Toaster } from "~/components/ui/sonner"
import { ThemeSync } from "~/components/App/ThemeSync"
import { useWindowSizeMemory } from "~/hooks/use-window-size-memory"
import { getLaunchFilePaths } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

const ScratchPromoteBridge = () => {
  const navigate = useNavigate()

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void listen<string>("scratch-promoted", (event) => {
      const path = event.payload
      if (!path) {
        return
      }
      navigate("/")
      void (async () => {
        const store = useWorkspaceStore.getState()
        await store.refreshTree()
        await store.selectFile(path)
      })()
    }).then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  }, [navigate])

  return null
}

export const Layouts = () => {
  const initialize = useWorkspaceStore((state) => state.initialize)

  useWindowSizeMemory()

  useEffect(() => {
    void (async () => {
      await initialize()
      try {
        const launchPaths = await getLaunchFilePaths()
        if (launchPaths.length === 0) {
          return
        }
        const { selectFile, setViewMode } = useWorkspaceStore.getState()
        setViewMode("preview")
        for (const path of launchPaths) {
          await selectFile(path.replace(/\\/g, "/"))
        }
        await selectFile(launchPaths[0].replace(/\\/g, "/"))
      } catch {
        // Browser / non-Tauri preview ignores launch args.
      }
    })()
  }, [initialize])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void listen<string[]>("open-files", (event) => {
      const paths = (event.payload ?? []).map((path) => path.replace(/\\/g, "/")).filter(Boolean)
      if (paths.length === 0) {
        return
      }
      void (async () => {
        const { selectFile, setViewMode } = useWorkspaceStore.getState()
        setViewMode("preview")
        for (const path of paths) {
          await selectFile(path)
        }
        await selectFile(paths[0])
      })()
    }).then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  }, [])

  return (
    <TooltipProvider delay={200}>
      <main className="app-mica relative h-full w-full overflow-hidden text-foreground">
        <ThemeSync />
        <ScratchPromoteBridge />
        <Outlet />
        <Toaster />
      </main>
    </TooltipProvider>
  )
}
