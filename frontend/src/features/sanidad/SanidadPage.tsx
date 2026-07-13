import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { AnimalSearchSelect } from "@/features/pesajes/components/AnimalSearchSelect"
import { cn } from "@/lib/utils"
import type { AnimalRead, DiagnosticoRead, SanidadEventoResumen, TratamientoRead, VacunacionRead } from "@/types/api"
import { DiagnosticoForm } from "./components/DiagnosticoForm"
import { TratamientoForm } from "./components/TratamientoForm"
import { VacunacionForm } from "./components/VacunacionForm"
import { useSanidadRecientes } from "./hooks/useSanidad"

// ── Tipos ──────────────────────────────────────────────────────

type TipoSanidad = "vacunacion" | "tratamiento" | "diagnostico"

const TIPOS: { value: TipoSanidad; label: string; description: string }[] = [
  { value: "vacunacion",   label: "Vacunación",   description: "Individual o lote completo"  },
  { value: "tratamiento",  label: "Tratamiento",  description: "Con cálculo de carencia"     },
  { value: "diagnostico",  label: "Diagnóstico",  description: "Registro veterinario"        },
]

interface SuccessResult {
  tipo: TipoSanidad
  mensaje: string
}

const TIPO_LABEL: Record<string, string> = {
  vacunacion:  "Vacunación",
  tratamiento: "Tratamiento",
  diagnostico: "Diagnóstico",
}

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Sub-componentes ────────────────────────────────────────────

function Historial({ eventos }: { eventos: SanidadEventoResumen[] }) {
  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-center">
        <p className="text-sm font-medium text-foreground">Sin eventos recientes</p>
        <p className="text-sm text-muted-foreground mt-1">
          Seleccioná un tipo en el panel izquierdo para registrar uno.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Últimas transacciones sanitarias
      </p>
      <div className="space-y-1.5">
        {eventos.map(e => (
          <div
            key={e.evento_id}
            className="flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{e.descripcion}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {TIPO_LABEL[e.tipo]}
                {e.total_animales > 1 ? ` · ${e.total_animales} animales` : ""}
                {e.animal_label ? ` · ${e.animal_label}` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {formatFecha(e.fecha_evento)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfirmacionCard({
  resultado,
  onNuevo,
}: {
  resultado: SuccessResult
  onNuevo: () => void
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="border-green-500/25 bg-green-500/10">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Evento registrado exitosamente</p>
              <p className="text-sm text-green-700 dark:text-green-400">{resultado.mensaje}</p>
            </div>
          </div>
          <Button onClick={onNuevo}>Registrar otro evento</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AnimalChip({ animal, onCambiar }: { animal: AnimalRead; onCambiar: () => void }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2 flex items-center justify-between text-sm">
      <div>
        <span className="font-mono font-medium">
          {animal.caravana_senacsa ?? animal.numero_campo}
        </span>
        <span className="text-muted-foreground ml-2 capitalize">
          {animal.categoria_actual?.replace(/_/g, " ") ?? ""}
        </span>
        {animal.lote_actual_nombre && (
          <span className="text-muted-foreground"> · {animal.lote_actual_nombre}</span>
        )}
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground underline"
        onClick={onCambiar}
      >
        cambiar
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function SanidadPage() {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSanidad | null>(null)
  const [resultado, setResultado] = useState<SuccessResult | null>(null)
  const [animalSeleccionado, setAnimalSeleccionado] = useState<AnimalRead | null>(null)

  const { data: lotesData } = useLotes("activo")
  const lotes = lotesData?.items ?? []
  const { data: recientes } = useSanidadRecientes()

  function seleccionar(tipo: TipoSanidad) {
    setTipoSeleccionado(tipo)
    setResultado(null)
    setAnimalSeleccionado(null)
  }

  function resetear() {
    setTipoSeleccionado(null)
    setResultado(null)
    setAnimalSeleccionado(null)
  }

  function onSuccessVacunacion(r: VacunacionRead) {
    setResultado({
      tipo: "vacunacion",
      mensaje: `${r.biologico} · ${r.total_animales} animal${r.total_animales !== 1 ? "es" : ""}${r.es_antiaftosa ? " · Antiaftosa" : ""}`,
    })
    setTipoSeleccionado(null)
  }

  function onSuccessTratamiento(r: TratamientoRead) {
    const carencia = r.dias_carencia > 0
      ? ` · Carencia hasta ${r.fecha_fin_carencia}`
      : " · Sin período de carencia"
    setResultado({ tipo: "tratamiento", mensaje: `${r.medicamento}${carencia}` })
    setTipoSeleccionado(null)
    setAnimalSeleccionado(null)
  }

  function onSuccessDiagnostico(r: DiagnosticoRead) {
    setResultado({ tipo: "diagnostico", mensaje: r.descripcion })
    setTipoSeleccionado(null)
    setAnimalSeleccionado(null)
  }

  const tipoActual = TIPOS.find(t => t.value === tipoSeleccionado)
  const necesitaAnimal = tipoSeleccionado === "tratamiento" || tipoSeleccionado === "diagnostico"

  return (
    <div className="flex min-h-[calc(100vh-3rem)]">

      {/* Sidebar izquierdo */}
      <aside className="w-44 shrink-0 border-r border-border px-3 pt-6">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tipos de evento
        </p>
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
        {!tipoSeleccionado && !resultado && <Historial eventos={recientes ?? []} />}

        {/* Confirmación */}
        {resultado && <ConfirmacionCard resultado={resultado} onNuevo={resetear} />}

        {/* Formulario */}
        {tipoSeleccionado && !resultado && (
          <div className="max-w-2xl space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">{tipoActual?.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{tipoActual?.description}</p>
            </div>

            {/* Selección de animal (tratamiento / diagnóstico) */}
            {necesitaAnimal && !animalSeleccionado && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-3">Buscá el animal</p>
                  <AnimalSearchSelect onSelect={setAnimalSeleccionado} />
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={resetear}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formularios */}
            {tipoSeleccionado === "vacunacion" && (
              <Card>
                <CardContent className="pt-6">
                  <VacunacionForm lotes={lotes} onSuccess={onSuccessVacunacion} onCancel={resetear} />
                </CardContent>
              </Card>
            )}

            {tipoSeleccionado === "tratamiento" && animalSeleccionado && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <AnimalChip animal={animalSeleccionado} onCambiar={() => setAnimalSeleccionado(null)} />
                  <TratamientoForm
                    animalId={animalSeleccionado.id}
                    onSuccess={onSuccessTratamiento}
                    onCancel={resetear}
                  />
                </CardContent>
              </Card>
            )}

            {tipoSeleccionado === "diagnostico" && animalSeleccionado && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <AnimalChip animal={animalSeleccionado} onCambiar={() => setAnimalSeleccionado(null)} />
                  <DiagnosticoForm
                    animalId={animalSeleccionado.id}
                    onSuccess={onSuccessDiagnostico}
                    onCancel={resetear}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
