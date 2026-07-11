import { Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useCalendarioSanitario } from "./hooks/useSanidad"
import type { CarenciaActiva, ProximaAntiaftosa } from "@/types/api"

function AnimalLabel({ animal }: { animal: { caravana_senacsa: string | null; numero_campo: string | null } }) {
  return (
    <span className="font-mono text-xs">
      {animal.caravana_senacsa ?? animal.numero_campo ?? "Sin ID"}
    </span>
  )
}

function AntiaftosaEstadoBadge({ estado }: { estado: ProximaAntiaftosa["estado"] }) {
  if (estado === "vencido") return <Badge variant="destructive">Vencida</Badge>
  if (estado === "proximo") return <Badge variant="secondary">Próxima</Badge>
  if (estado === "sin_registro") return <Badge variant="outline">Sin registro</Badge>
  return <Badge variant="default">Al día</Badge>
}

export function CalendarioSanitarioPage() {
  const { data, isLoading, error } = useCalendarioSanitario()

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando calendario...</div>
  if (error) return <div className="p-6 text-sm text-destructive">Error al cargar el calendario.</div>
  if (!data) return null

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendario Sanitario
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Carencias activas y próximas vacunaciones antiaftosa.
        </p>
      </div>

      {/* Carencias activas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="font-medium text-sm">
            Carencias activas
            <span className="ml-2 text-muted-foreground font-normal">({data.total_carencias})</span>
          </h2>
        </div>

        {data.carencias_activas.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No hay animales con carencia activa.
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {data.carencias_activas.map((c: CarenciaActiva) => (
              <div key={c.animal_id} className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <AnimalLabel animal={c} />
                  <p className="text-xs text-muted-foreground">{c.medicamento}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <Badge variant="destructive" className="text-xs">
                    {c.dias_restantes} día{c.dias_restantes !== 1 ? "s" : ""} restante{c.dias_restantes !== 1 ? "s" : ""}
                  </Badge>
                  <p className="text-xs text-muted-foreground">hasta {c.fecha_fin_carencia}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Próximas antiaftosa */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h2 className="font-medium text-sm">
            Antiaftosa próxima a vencer o sin registro
            <span className="ml-2 text-muted-foreground font-normal">({data.total_proximas_antiaftosa})</span>
          </h2>
        </div>

        {data.proximas_antiaftosa.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Todos los animales tienen la antiaftosa al día.
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {data.proximas_antiaftosa.map((a: ProximaAntiaftosa) => (
              <div key={a.animal_id} className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <AnimalLabel animal={a} />
                  <p className="text-xs text-muted-foreground">
                    Última: {a.ultima_antiaftosa ?? "sin registro"}
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <AntiaftosaEstadoBadge estado={a.estado} />
                  {a.proxima_estimada && (
                    <p className="text-xs text-muted-foreground">próxima: {a.proxima_estimada}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
