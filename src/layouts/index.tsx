import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
import { ThemeSync } from '~/components/App/ThemeSync'
import { useWorkspaceStore } from '~/store/workspace'

export const Layouts = () => {
  const settings = useWorkspaceStore((state) => state.config?.settings)
  const themeMode = settings?.themeMode ?? 'system'
  const resolvedTheme = themeMode === 'system' ? 'system' : themeMode

  return (
    <TooltipProvider delay={200}>
      <main className="h-full w-full overflow-hidden bg-background text-foreground">
        <ThemeSync />
        <Outlet />
        <Toaster theme={resolvedTheme} richColors closeButton position="bottom-right" />
      </main>
    </TooltipProvider>
  )
}
