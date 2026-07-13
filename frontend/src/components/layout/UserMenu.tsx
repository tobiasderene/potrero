import { useEffect, useRef, useState } from "react"
import { LogOut, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/AuthContext"
import { useMe } from "@/hooks/useMe"
import { usePermissions } from "@/hooks/usePermissions"
import { useDarkMode } from "@/hooks/useDarkMode"

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { signOut } = useAuth()
  const { data: me } = useMe()
  const { rol } = usePermissions()
  const { dark, toggle } = useDarkMode()

  const initial = me?.email?.[0]?.toUpperCase() ?? "?"

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full bg-campo-600/20 text-xs font-semibold text-campo-600 dark:text-campo-200 transition-colors hover:bg-campo-600/30",
          open && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-medium text-foreground truncate">{me?.email}</p>
            {rol && <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{rol}</p>}
          </div>

          <div className="p-1">
            <button
              onClick={() => { toggle(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {dark ? "Modo claro" : "Modo oscuro"}
            </button>
          </div>

          <div className="mx-2 h-px bg-border" />

          <div className="p-1">
            <button
              onClick={() => { signOut(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
