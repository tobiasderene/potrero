import { useState } from "react"
import { CheckCircle2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAnimales } from "@/features/animales/hooks/useAnimales"
import type { AnimalRead } from "@/types/api"

interface Props {
  label: string
  selected: Map<string, AnimalRead>
  onToggle: (animal: AnimalRead) => void
  onClear: () => void
  renderBadge?: (a: AnimalRead) => React.ReactNode
}

function animalLabel(a: AnimalRead) {
  const id = a.caravana_senacsa ?? a.numero_campo ?? "—"
  const cat = a.categoria_actual ? ` — ${a.categoria_actual.replace(/_/g, " ")}` : ""
  return id + cat
}

export function AnimalMultiSearchSelect({ label, selected, onToggle, onClear, renderBadge }: Props) {
  const [query, setQuery] = useState("")

  const noQuery = { estado: "activo", limit: 0 }
  const { data: byCaravana } = useAnimales(
    query.length >= 2 ? { caravana: query, estado: "activo", limit: 10 } : noQuery
  )
  const { data: byCampo } = useAnimales(
    query.length >= 2 ? { numero_campo: query, estado: "activo", limit: 10 } : noQuery
  )

  const resultados = (() => {
    if (query.length < 2) return []
    const seen = new Set<string>()
    return [...(byCaravana?.items ?? []), ...(byCampo?.items ?? [])].filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
  })()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label} * ({selected.size} seleccionados)</Label>
        {selected.size > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por caravana o n° campo (mín. 2 caracteres)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.length >= 2 && (
        <div className="rounded-md border divide-y max-h-52 overflow-y-auto">
          {resultados.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              Sin resultados para "{query}"
            </p>
          ) : (
            resultados.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 transition-colors ${
                  selected.has(a.id) ? "bg-primary/5" : ""
                }`}
                onClick={() => onToggle(a)}
              >
                {selected.has(a.id) ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border shrink-0" />
                )}
                <span className="flex-1">{animalLabel(a)}</span>
                {renderBadge?.(a)}
              </button>
            ))
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from(selected.values()).map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-mono"
            >
              {a.caravana_senacsa ?? a.numero_campo ?? "Sin ID"}
              <button
                type="button"
                onClick={() => onToggle(a)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
