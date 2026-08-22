import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "~/lib/utils"

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: "default" | "primary" | "danger"
  children: ReactNode
}

export const GlassStreamIconButton = ({
  active,
  tone = "default",
  className,
  children,
  ...props
}: Props) => {
  return (
    <button
      type="button"
      className={cn(
        "glass-stream-icon-btn",
        active && "is-active",
        tone === "primary" && "is-primary",
        tone === "danger" && "is-danger",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
