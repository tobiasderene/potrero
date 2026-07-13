import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAnimales } from "@/features/animales/hooks/useAnimales"
import type { AnimalRead } from "@/types/api"

interface Props {
  onSelect: (animal: AnimalRead) => void
}

export function AnimalSearchSelect({ onSelect }: Props) {
  const [query, setQuery] = useState("")

  const active = query.length >= 2
  const { data: byCaravana } = useAnimales({ caravana: query, estado: "activo", limit: 8, enabled: active })
  const { data: byCampo } = useAnimales({ numero_campo: query, estado: "activo", limit: 8, enabled: active })

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
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por caravana o n° campo (mín. 2 caracteres)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query.length >= 2 && (
        <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
          {resultados.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              Sin resultados para "{query}"
            </p>
          ) : (
            resultados.map((a) => (
              <button
                key={a.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={() => onSelect(a)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-sm font-medium">
                      {a.caravana_senacsa ?? a.numero_campo ?? "Sin ID"}
                    </span>
                    {a.numero_campo && a.caravana_senacsa && (
                      <span className="text-xs text-muted-foreground ml-2">
                        campo: {a.numero_campo}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <span className="capitalize">{a.categoria_actual?.replace(/_/g, " ") ?? "—"}</span>
                    {a.lote_actual_nombre && (
                      <span className="block">{a.lote_actual_nombre}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
