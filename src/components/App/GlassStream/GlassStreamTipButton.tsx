import type { ButtonHTMLAttributes, ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"

import { GlassStreamIconButton } from "./GlassStreamIconButton"

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tip: string
  active?: boolean
  tone?: "default" | "primary" | "danger"
  children: ReactNode
}

export const GlassStreamTipButton = ({
  tip,
  active,
  tone,
  children,
  ...props
}: Props) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <GlassStreamIconButton active={active} tone={tone} aria-label={tip} {...props} />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  )
}
