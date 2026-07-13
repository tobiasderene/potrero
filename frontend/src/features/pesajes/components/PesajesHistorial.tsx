import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { PesajeRead } from "@/types/api"

interface Props {
  pesajes: PesajeRead[]
  loteId: string
  anular: (vars: { eventoId: string; loteId: string }) => void
  anulando: boolean
}

function calcularGdpDinamico(pesajes: PesajeRead[]): (number | null)[] {
  const asc = [...pesajes].sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento))
  return asc.map((p, i) => {
    if (i === 0) return null
    const prev = asc[i - 1]
    const dias =
      (new Date(p.fecha_evento).getTime() - new Date(prev.fecha_evento).getTime()) / 86_400_000
    if (dias <= 0) return null
    return Math.round(((Number(p.peso_kg) - Number(prev.peso_kg)) / dias) * 1000)
  })
}

export function PesajesHistorial({ pesajes, loteId, anular, anulando }: Props) {
  const asc = [...pesajes].sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento))
  const gdpAsc = calcularGdpDinamico(pesajes)

  // Mostrar más reciente primero
  const desc = [...asc].reverse()
  const gdpDesc = [...gdpAsc].reverse()

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Historial de pesajes</p>
      <div className="rounded-lg bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] overflow-hidden divide-y divide-border/60 text-sm">
        {desc.map((p, i) => {
          const gdp = gdpDesc[i]
          return (
            <div key={p.evento_id} className="flex items-center justify-between px-3 py-2 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground w-24 shrink-0">{p.fecha_evento}</span>
                <span className="font-medium tabular-nums">{Number(p.peso_kg).toFixed(1)} kg</span>
                {p.cantidad_muestra != null && (
                  <span className="text-muted-foreground text-xs">muestra: {p.cantidad_muestra}</span>
                )}
                {gdp != null && (
                  <Badge
                    variant={gdp >= 0 ? "secondary" : "destructive"}
                    className="text-xs tabular-nums"
                  >
                    {gdp >= 0 ? "+" : ""}{gdp} g/d
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive shrink-0"
                disabled={anulando}
                onClick={() => {
                  if (confirm(`¿Anular pesaje del ${p.fecha_evento} (${Number(p.peso_kg).toFixed(1)} kg)?`)) {
                    anular({ eventoId: p.evento_id, loteId })
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
