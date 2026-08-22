import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "~/components/ui/dropdown-menu"
import { EXTENSION_GROUPS } from "~/lib/rename"

interface Props {
  onSelect: (extension: string) => void
  /** Highlight the currently selected extension. */
  current?: string
}

/** Categorized extension picker (nested submenu). */
export const ExtensionGroupMenu = ({ onSelect, current }: Props) => {
  const normalized = (current ?? "").replace(/^\./, "").toLowerCase()

  return (
    <>
      {EXTENSION_GROUPS.map((group) => (
        <DropdownMenuSub key={group.id}>
          <DropdownMenuSubTrigger className="gap-2">
            <span className="flex-1">{group.label}</span>
            <span className="text-[11px] text-muted-foreground">{group.extensions.length}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[min(50vh,280px)] min-w-[8.5rem] overflow-y-auto">
            {group.extensions.map((ext) => {
              const active = normalized === ext
              return (
                <DropdownMenuItem
                  key={ext}
                  onClick={() => onSelect(ext)}
                  className={active ? "bg-accent text-accent-foreground" : undefined}
                >
                  .{ext}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}
    </>
  )
}
