import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { TableSkeleton } from "@/components/table-skeleton"
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
  if (estado === "vencido")     return <Badge variant="danger">Vencida</Badge>
  if (estado === "proximo")     return <Badge variant="warning">Próxima</Badge>
  if (estado === "sin_registro") return <Badge variant="inactive">Sin registro</Badge>
  return <Badge variant="success">Al día</Badge>
}

function SectionOk({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {text}
    </div>
  )
}

export function CalendarioSanitarioPage() {
  const { data, isLoading, error } = useCalendarioSanitario()

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl space-y-6">
        <div className="h-7 w-56 bg-muted animate-pulse rounded" />
        <TableSkeleton cols={2} rows={4} />
        <TableSkeleton cols={2} rows={4} />
      </div>
    )
  }

  if (error) return (
    <div className="p-6 text-sm text-destructive">Error al cargar el calendario.</div>
  )

  if (!data) return null

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <PageHeader
        title="Calendario Sanitario"
        description="Carencias activas y próximas vacunaciones antiaftosa."
      />

      {/* Carencias activas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold">
            Carencias activas
            <span className="ml-2 text-muted-foreground font-normal">({data.total_carencias})</span>
          </h2>
        </div>

        {data.carencias_activas.length === 0 ? (
          <SectionOk text="No hay animales con carencia activa." />
        ) : (
          <div className="rounded-lg bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] overflow-hidden divide-y divide-border/60">
            {data.carencias_activas.map((c: CarenciaActiva) => (
              <div key={c.animal_id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <AnimalLabel animal={c} />
                  <p className="text-xs text-muted-foreground">{c.medicamento}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant="danger">
                    {c.dias_restantes} día{c.dias_restantes !== 1 ? "s" : ""} restante{c.dias_restantes !== 1 ? "s" : ""}
                  </Badge>
                  <p className="text-xs text-muted-foreground">hasta {c.fecha_fin_carencia}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Próximas antiaftosa */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">
            Antiaftosa próxima a vencer o sin registro
            <span className="ml-2 text-muted-foreground font-normal">({data.total_proximas_antiaftosa})</span>
          </h2>
        </div>

        {data.proximas_antiaftosa.length === 0 ? (
          <SectionOk text="Todos los animales tienen la antiaftosa al día." />
        ) : (
          <div className="rounded-lg bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] overflow-hidden divide-y divide-border/60">
            {data.proximas_antiaftosa.map((a: ProximaAntiaftosa) => (
              <div key={a.animal_id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <AnimalLabel animal={a} />
                  <p className="text-xs text-muted-foreground">
                    Última: {a.ultima_antiaftosa ?? "sin registro"}
                  </p>
                </div>
                <div className="text-right space-y-1">
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
