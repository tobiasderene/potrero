import { TrendingUp, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useGdpLote } from "../hooks/usePesajes"

interface Props {
  loteId: string
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "completo") return <Badge variant="default">Completo</Badge>
  if (estado === "parcial") return <Badge variant="secondary">Parcial</Badge>
  return <Badge variant="outline">Sin dato suficiente</Badge>
}

export function GdpLoteCard({ loteId }: Props) {
  const { data, isLoading } = useGdpLote(loteId)

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando GDP...</div>
  if (!data) return null

  const promedio = data.gdp_promedio_g_dia ? Number(data.gdp_promedio_g_dia) : null
  const minimo = data.gdp_minimo_g_dia ? Number(data.gdp_minimo_g_dia) : null
  const maximo = data.gdp_maximo_g_dia ? Number(data.gdp_maximo_g_dia) : null

  if (data.estado === "sin_dato_suficiente") {
    return (
      <div className="rounded-lg border p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">GDP del lote (IND-02)</p>
          <EstadoBadge estado={data.estado} />
        </div>
        <p className="text-sm text-muted-foreground">
          No hay suficientes pesajes para calcular la ganancia diaria de peso.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">GDP del lote (IND-02)</p>
        <EstadoBadge estado={data.estado} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Minus className="h-3 w-3" />
            <span className="text-xs">Mínimo</span>
          </div>
          <p className="text-lg font-semibold">
            {minimo !== null ? `${minimo.toFixed(0)} g/d` : "—"}
          </p>
        </div>
        <div className="text-center border-x">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs">Promedio</span>
          </div>
          <p className="text-2xl font-bold">
            {promedio !== null ? `${promedio.toFixed(0)} g/d` : "—"}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs">Máximo</span>
          </div>
          <p className="text-lg font-semibold">
            {maximo !== null ? `${maximo.toFixed(0)} g/d` : "—"}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Basado en {data.total_animales_con_gdp} de {data.total_animales_lote} animales con ≥2 pesajes
      </p>
    </div>
  )
}
