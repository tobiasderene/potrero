import { TrendingUp, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useGdpPotrero } from "../hooks/usePesajes"

const CARD = "rounded-lg bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] p-4"

interface Props { potreroId: string }

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "completo") return <Badge variant="default">Completo</Badge>
  if (estado === "parcial") return <Badge variant="secondary">Parcial</Badge>
  return <Badge variant="outline">Sin dato suficiente</Badge>
}

export function GdpPotreroCard({ potreroId }: Props) {
  const { data, isLoading } = useGdpPotrero(potreroId)

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando GDP...</div>
  if (!data) return null

  const promedio = data.gdp_promedio_g_dia ? Number(data.gdp_promedio_g_dia) : null
  const minimo   = data.gdp_minimo_g_dia   ? Number(data.gdp_minimo_g_dia)   : null
  const maximo   = data.gdp_maximo_g_dia   ? Number(data.gdp_maximo_g_dia)   : null

  if (data.estado === "sin_dato_suficiente") {
    return (
      <div className={`${CARD} space-y-1`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">GDP del potrero</p>
          <EstadoBadge estado={data.estado} />
        </div>
        <p className="text-sm text-muted-foreground">
          {data.total_animales_potrero === 0
            ? "No hay animales activos en este potrero."
            : "No hay suficientes pesajes individuales para calcular la ganancia diaria de peso."}
        </p>
      </div>
    )
  }

  return (
    <div className={`${CARD} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">GDP del potrero</p>
        <EstadoBadge estado={data.estado} />
      </div>

      {minimo !== null && maximo !== null ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Minus className="h-3 w-3" />
              <span className="text-xs">Mínimo</span>
            </div>
            <p className="text-lg font-semibold">{minimo.toFixed(0)} g/d</p>
          </div>
          <div className="text-center bg-muted/30 rounded-lg py-1">
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
            <p className="text-lg font-semibold">{maximo.toFixed(0)} g/d</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <p className="text-2xl font-bold">
            {promedio !== null ? `${promedio.toFixed(0)} g/d` : "—"}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Basado en {data.total_animales_con_gdp} de {data.total_animales_potrero} animales con ≥2 pesajes individuales
      </p>
    </div>
  )
}
