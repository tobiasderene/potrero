import type { ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function FilterBar({
  children,
  activeCount,
  onClear,
  className,
}: {
  children: ReactNode
  /** Número de filtros activos (distintos del estado por defecto). */
  activeCount?: number
  onClear?: () => void
  className?: string
}) {
  const hasActive = activeCount != null && activeCount > 0

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {children}

      {hasActive && (
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-muted-foreground">
            {activeCount} filtro{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""}
          </span>
          {onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-0.5 text-xs font-medium text-campo-600 hover:text-campo-700 transition-colors duration-150"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
