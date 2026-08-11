"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { useWorkspaceStore } from "~/store/workspace"

/** shadcn Sonner — top-right, no next-themes dependency. */
const Toaster = ({ ...props }: ToasterProps) => {
  const themeMode = useWorkspaceStore((state) => state.config?.settings.themeMode ?? "system")
  const theme = (themeMode === "system" ? "system" : themeMode) as ToasterProps["theme"]

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      gap={10}
      offset={16}
      duration={3600}
      visibleToasts={3}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast border border-border/60 bg-popover text-popover-foreground shadow-lg",
          title: "text-[13px] font-medium",
          description: "text-[12px] text-muted-foreground",
          error: "border-destructive/30",
          closeButton: "border-border/50 bg-background",
        },
      }}
      {...props}
      position="top-right"
    />
  )
}

export { Toaster }
