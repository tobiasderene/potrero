import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useDashboard } from "@/features/dashboard/hooks/useDashboard"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { cn } from "@/lib/utils"
import type { MovimientoResumenRead } from "@/types/api"
import { AsignacionLoteForm } from "./components/AsignacionLoteForm"
import { EgresoMuerteForm } from "./components/EgresoMuerteForm"
import { EgresoVentaForm } from "./components/EgresoVentaForm"
import { IngresoCompraForm } from "./components/IngresoCompraForm"
import { NacimientoForm } from "./components/NacimientoForm"
import { TrasladoForm } from "./components/TrasladoForm"

// ── Tipos ──────────────────────────────────────────────────────

type TipoMovimiento =
  | "ingreso_compra"
  | "nacimiento"
  | "traslado"
  | "asignacion_lote"
  | "egreso_venta"
  | "egreso_muerte"

const TIPOS: {
  value: TipoMovimiento
  label: string
  description: string
}[] = [
  { value: "ingreso_compra",  label: "Ingreso por compra",  description: "Registrar animales comprados externamente"   },
  { value: "nacimiento",      label: "Nacimiento",          description: "Registrar cría nacida en el establecimiento" },
  { value: "traslado",        label: "Traslado interno",    description: "Mover animales entre potreros"               },
  { value: "asignacion_lote", label: "Asignación a lote",   description: "Agregar animales existentes a un lote activo"},
  { value: "egreso_venta",    label: "Egreso por venta",    description: "Registrar venta (requiere caravana SENACSA)" },
  { value: "egreso_muerte",   label: "Egreso por muerte",   description: "Registrar baja por muerte"                   },
]

const MOV_LABEL: Record<string, string> = {
  ingreso_compra:   "Ingreso por compra",
  nacimiento:       "Nacimiento",
  traslado_interno: "Traslado interno",
  asignacion_lote:  "Asignación a lote",
  egreso_venta:     "Egreso por venta",
  egreso_faena:     "Egreso por faena",
  egreso_muerte:    "Egreso por muerte",
}

// ── Helpers ────────────────────────────────────────────────────

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

interface SuccessResult {
  evento_id: string
  tipo: TipoMovimiento
  advertencias?: string[]
  asignados?: number
}

// ── Sub-componentes ────────────────────────────────────────────

function Historial({ movimientos }: { movimientos: MovimientoResumenRead[] }) {
  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-center">
        <p className="text-sm font-medium text-foreground">Sin movimientos registrados</p>
        <p className="text-sm text-muted-foreground mt-1">
          Seleccioná un tipo en el panel izquierdo para registrar uno.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Últimas transacciones
      </p>
      <div className="space-y-1.5">
        {movimientos.map(m => (
          <div
            key={m.evento_id}
            className="flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {MOV_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m.total_animales} animal{m.total_animales !== 1 ? "es" : ""}
                {m.potrero_destino_nombre ? ` · ${m.potrero_destino_nombre}` : ""}
                {m.lote_destino_nombre ? ` · Lote ${m.lote_destino_nombre}` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {formatFecha(m.fecha_evento)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfirmacionCard({
  resultado,
  tipoLabel,
  onNuevo,
}: {
  resultado: SuccessResult
  tipoLabel: string
  onNuevo: () => void
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="border-green-500/25 bg-green-500/10">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                {resultado.tipo === "asignacion_lote"
                  ? `${resultado.asignados} animal${resultado.asignados !== 1 ? "es" : ""} asignado${resultado.asignados !== 1 ? "s" : ""} al lote`
                  : "Movimiento registrado exitosamente"}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">{tipoLabel}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">ID: {resultado.evento_id}</p>

          {resultado.advertencias && resultado.advertencias.length > 0 && (
            <Alert>
              <AlertDescription className="space-y-1">
                {resultado.advertencias.map((adv, i) => (
                  <p key={i} className="text-amber-700 dark:text-amber-400">⚠ {adv}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={onNuevo}>Registrar otro movimiento</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function MovimientosPage() {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoMovimiento | null>(null)
  const [resultado, setResultado] = useState<SuccessResult | null>(null)

  const { data: potrerosData } = usePotreros()
  const { data: lotesData } = useLotes("activo")
  const { data: dashboard } = useDashboard()

  const potreros = potrerosData?.items ?? []
  const lotes = lotesData?.items ?? []
  const recientes = dashboard?.ultimos_movimientos ?? []

  function seleccionar(tipo: TipoMovimiento) {
    setTipoSeleccionado(tipo)
    setResultado(null)
  }

  function onSuccess(result: { evento_id: string; [key: string]: unknown }) {
    const { evento_id, ...rest } = result
    setResultado({ evento_id, tipo: tipoSeleccionado!, ...rest })
    setTipoSeleccionado(null)
  }

  function resetear() {
    setTipoSeleccionado(null)
    setResultado(null)
  }

  const tipoActual = TIPOS.find(t => t.value === tipoSeleccionado)

  return (
    <div className="flex min-h-[calc(100vh-3rem)]">

      {/* Sidebar izquierdo */}
      <aside className="w-44 shrink-0 border-r border-border px-3 pt-6">
        <nav className="space-y-0.5">
          {TIPOS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => seleccionar(value)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm transition-colors duration-150 rounded",
                tipoSeleccionado === value
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Panel derecho */}
      <div className="flex-1 min-w-0 p-6">

        {/* Historial — estado por defecto */}
        {!tipoSeleccionado && !resultado && (
          <Historial movimientos={recientes} />
        )}

        {/* Confirmación */}
        {resultado && (
          <ConfirmacionCard
            resultado={resultado}
            tipoLabel={TIPOS.find(t => t.value === resultado.tipo)?.label ?? ""}
            onNuevo={resetear}
          />
        )}

        {/* Formulario */}
        {tipoSeleccionado && !resultado && (
          <div className="max-w-2xl space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">{tipoActual?.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{tipoActual?.description}</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {tipoSeleccionado === "ingreso_compra" && (
                  <IngresoCompraForm potreros={potreros} lotes={lotes} onSuccess={onSuccess} onCancel={resetear} />
                )}
                {tipoSeleccionado === "nacimiento" && (
                  <NacimientoForm potreros={potreros} lotes={lotes} onSuccess={onSuccess} onCancel={resetear} />
                )}
                {tipoSeleccionado === "traslado" && (
                  <TrasladoForm potreros={potreros} onSuccess={onSuccess} onCancel={resetear} />
                )}
                {tipoSeleccionado === "asignacion_lote" && (
                  <AsignacionLoteForm
                    lotes={lotes}
                    onSuccess={r => onSuccess({ evento_id: r.evento_id, asignados: r.asignados })}
                    onCancel={resetear}
                  />
                )}
                {tipoSeleccionado === "egreso_venta" && (
                  <EgresoVentaForm onSuccess={onSuccess} onCancel={resetear} />
                )}
                {tipoSeleccionado === "egreso_muerte" && (
                  <EgresoMuerteForm onSuccess={onSuccess} onCancel={resetear} />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
