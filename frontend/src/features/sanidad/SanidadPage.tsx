import { useState } from "react"
import { CheckCircle2, Pill, Stethoscope, Syringe } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"
import { VacunacionForm } from "./components/VacunacionForm"
import { TratamientoForm } from "./components/TratamientoForm"
import { DiagnosticoForm } from "./components/DiagnosticoForm"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { AnimalSearchSelect } from "@/features/pesajes/components/AnimalSearchSelect"
import type { AnimalRead } from "@/types/api"

const ACCIONES = [
  {
    key: "vacunacion",
    icon: Syringe,
    label: "Vacunación",
    description: "Individual o lote completo",
  },
  {
    key: "tratamiento",
    icon: Pill,
    label: "Tratamiento",
    description: "Con cálculo de carencia",
  },
  {
    key: "diagnostico",
    icon: Stethoscope,
    label: "Diagnóstico",
    description: "Registro veterinario",
  },
] as const

function AnimalChip({
  animal,
  onCambiar,
}: {
  animal: AnimalRead
  onCambiar: () => void
}) {
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

export function SanidadPage() {
  const [showVacunacion, setShowVacunacion] = useState(false)
  const [showTratamiento, setShowTratamiento] = useState(false)
  const [showDiagnostico, setShowDiagnostico] = useState(false)
  const [animalTratamiento, setAnimalTratamiento] = useState<AnimalRead | null>(null)
  const [animalDiagnostico, setAnimalDiagnostico] = useState<AnimalRead | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const { data: lotesData } = useLotes("activo")
  const lotes = lotesData?.items ?? []

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title="Sanidad"
        description="Registrá vacunaciones, tratamientos y diagnósticos veterinarios."
      />

      <div className="grid grid-cols-3 gap-3">
        {ACCIONES.map(({ key, icon: Icon, label, description }) => (
          <button
            key={key}
            onClick={() => {
              if (key === "vacunacion") setShowVacunacion(true)
              if (key === "tratamiento") { setAnimalTratamiento(null); setShowTratamiento(true) }
              if (key === "diagnostico") { setAnimalDiagnostico(null); setShowDiagnostico(true) }
            }}
            className="rounded-lg border p-5 text-left hover:bg-accent hover:border-campo-200 transition-colors duration-150 space-y-2"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </button>
        ))}
      </div>

      {lastResult && (
        <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {lastResult}
        </div>
      )}

      {/* Vacunación */}
      <Dialog open={showVacunacion} onOpenChange={setShowVacunacion}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar vacunación</DialogTitle></DialogHeader>
          <VacunacionForm
            lotes={lotes}
            onSuccess={(r) => {
              setLastResult(`Vacunación registrada · ${r.biologico} · ${r.total_animales} animal(es)${r.es_antiaftosa ? " · Antiaftosa" : ""}`)
              setShowVacunacion(false)
            }}
            onCancel={() => setShowVacunacion(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Tratamiento */}
      <Dialog
        open={showTratamiento}
        onOpenChange={(open) => { setShowTratamiento(open); if (!open) setAnimalTratamiento(null) }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar tratamiento veterinario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!animalTratamiento ? (
              <AnimalSearchSelect onSelect={setAnimalTratamiento} />
            ) : (
              <>
                <AnimalChip animal={animalTratamiento} onCambiar={() => setAnimalTratamiento(null)} />
                <TratamientoForm
                  animalId={animalTratamiento.id}
                  onSuccess={(r) => {
                    const carencia = r.dias_carencia > 0
                      ? ` · Carencia hasta ${r.fecha_fin_carencia}`
                      : " · Sin período de carencia"
                    setLastResult(`Tratamiento registrado · ${r.medicamento}${carencia}`)
                    setShowTratamiento(false)
                    setAnimalTratamiento(null)
                  }}
                  onCancel={() => { setShowTratamiento(false); setAnimalTratamiento(null) }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diagnóstico */}
      <Dialog
        open={showDiagnostico}
        onOpenChange={(open) => { setShowDiagnostico(open); if (!open) setAnimalDiagnostico(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar diagnóstico veterinario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!animalDiagnostico ? (
              <AnimalSearchSelect onSelect={setAnimalDiagnostico} />
            ) : (
              <>
                <AnimalChip animal={animalDiagnostico} onCambiar={() => setAnimalDiagnostico(null)} />
                <DiagnosticoForm
                  animalId={animalDiagnostico.id}
                  onSuccess={(r) => {
                    setLastResult(`Diagnóstico registrado · ${r.descripcion}`)
                    setShowDiagnostico(false)
                    setAnimalDiagnostico(null)
                  }}
                  onCancel={() => { setShowDiagnostico(false); setAnimalDiagnostico(null) }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
