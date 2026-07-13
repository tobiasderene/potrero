import { useState } from "react"
import { MapPin, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PotreroEnriquecido } from "../hooks/useTorreControl"

interface Props {
  potreros: PotreroEnriquecido[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}

const ESTADO_DOT: Record<string, string> = {
  critico: "bg-red-500",
  advertencia: "bg-amber-400",
  normal: "bg-green-500",
}

const ALERTA_BADGE: Record<string, string> = {
  critico: "bg-red-50 text-red-600 ring-1 ring-red-200",
  advertencia: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  normal: "",
}

export function ListaPotreros({ potreros, selectedId, onSelect, isLoading }: Props) {
  const [search, setSearch] = useState("")
  const [filtro, setFiltro] = useState<"todos" | "alertas">("todos")

  const critCount = potreros.filter(p => p.estado === "critico").length
  const advCount = potreros.filter(p => p.estado === "advertencia").length

  const visible = potreros
    .filter(p => p.potrero.nombre.toLowerCase().includes(search.toLowerCase()))
    .filter(p => filtro === "todos" || p.alertas.length > 0)

  return (
    <aside className="w-72 shrink-0 shadow-[-2px_0_8px_0_rgb(0_0_0/0.05)] sticky top-0 self-start h-screen flex flex-col bg-sidebar">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Potreros
          </h2>
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">{potreros.length}</span>
          )}
        </div>

        {/* Estado global */}
        {(critCount > 0 || advCount > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {critCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                {critCount} crítico{critCount !== 1 ? "s" : ""}
              </span>
            )}
            {advCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                {advCount} advertencia{advCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Buscar potrero..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-1">
          {(["todos", "alertas"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md transition-colors",
                filtro === f
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "todos" ? "Todos" : "Con alertas"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {isLoading ? (
          <div className="space-y-px p-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[72px] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10 px-4">
            {search ? "Sin resultados para esa búsqueda" : "Sin potreros activos"}
          </p>
        ) : (
          visible.map(p => {
            const isSelected = p.potrero.id === selectedId
            const ocupPct = p.carga?.porcentaje_ocupacion
              ? parseFloat(p.carga.porcentaje_ocupacion).toFixed(0)
              : null

            return (
              <button
                key={p.potrero.id}
                onClick={() => onSelect(p.potrero.id)}
                className={cn(
                  "w-full text-left px-4 py-3.5 transition-colors",
                  "hover:bg-sidebar-accent/60",
                  isSelected ? "bg-sidebar-accent" : "",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 rounded-full shrink-0",
                        ESTADO_DOT[p.estado],
                      )}
                    />
                    <span className="text-sm font-medium truncate">{p.potrero.nombre}</span>
                  </div>
                  {p.alertas.length > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                        ALERTA_BADGE[p.estado],
                      )}
                    >
                      {p.alertas.length}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 pl-4 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{p.carga?.total_animales ?? 0} animales</span>
                  {ocupPct ? (
                    <span>{ocupPct}% ocup.</span>
                  ) : p.potrero.superficie_ha ? (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {p.potrero.superficie_ha} ha
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
