import { useState } from "react"
import { Syringe, Pill, Stethoscope } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VacunacionForm } from "./components/VacunacionForm"
import { TratamientoForm } from "./components/TratamientoForm"
import { DiagnosticoForm } from "./components/DiagnosticoForm"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { AnimalSearchSelect } from "@/features/pesajes/components/AnimalSearchSelect"
import type { AnimalRead } from "@/types/api"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Sanidad
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registre vacunaciones, tratamientos y diagnósticos veterinarios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setShowVacunacion(true)}
          className="rounded-lg border p-5 text-left hover:bg-muted/50 transition-colors space-y-2"
        >
          <Syringe className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-sm">Vacunación</p>
          <p className="text-xs text-muted-foreground">Individual o lote completo</p>
        </button>
        <button
          onClick={() => { setAnimalTratamiento(null); setShowTratamiento(true) }}
          className="rounded-lg border p-5 text-left hover:bg-muted/50 transition-colors space-y-2"
        >
          <Pill className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-sm">Tratamiento</p>
          <p className="text-xs text-muted-foreground">Con cálculo de carencia</p>
        </button>
        <button
          onClick={() => { setAnimalDiagnostico(null); setShowDiagnostico(true) }}
          className="rounded-lg border p-5 text-left hover:bg-muted/50 transition-colors space-y-2"
        >
          <Stethoscope className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-sm">Diagnóstico</p>
          <p className="text-xs text-muted-foreground">Registro veterinario</p>
        </button>
      </div>

      {lastResult && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {lastResult}
        </div>
      )}

      {/* Vacunación */}
      <Dialog open={showVacunacion} onOpenChange={setShowVacunacion}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar vacunación</DialogTitle>
          </DialogHeader>
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
      <Dialog open={showTratamiento} onOpenChange={(open) => { setShowTratamiento(open); if (!open) setAnimalTratamiento(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar tratamiento veterinario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!animalTratamiento ? (
              <AnimalSearchSelect onSelect={setAnimalTratamiento} />
            ) : (
              <>
                <div className="rounded-md bg-muted px-3 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono font-medium">
                      {animalTratamiento.caravana_senacsa ?? animalTratamiento.numero_campo}
                    </span>
                    <span className="text-muted-foreground ml-2 capitalize">
                      {animalTratamiento.categoria_actual?.replace(/_/g, " ") ?? ""}
                    </span>
                    {animalTratamiento.lote_actual_nombre && (
                      <span className="text-muted-foreground"> · {animalTratamiento.lote_actual_nombre}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setAnimalTratamiento(null)}
                  >
                    cambiar
                  </button>
                </div>
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
      <Dialog open={showDiagnostico} onOpenChange={(open) => { setShowDiagnostico(open); if (!open) setAnimalDiagnostico(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar diagnóstico veterinario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!animalDiagnostico ? (
              <AnimalSearchSelect onSelect={setAnimalDiagnostico} />
            ) : (
              <>
                <div className="rounded-md bg-muted px-3 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono font-medium">
                      {animalDiagnostico.caravana_senacsa ?? animalDiagnostico.numero_campo}
                    </span>
                    <span className="text-muted-foreground ml-2 capitalize">
                      {animalDiagnostico.categoria_actual?.replace(/_/g, " ") ?? ""}
                    </span>
                    {animalDiagnostico.lote_actual_nombre && (
                      <span className="text-muted-foreground"> · {animalDiagnostico.lote_actual_nombre}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setAnimalDiagnostico(null)}
                  >
                    cambiar
                  </button>
                </div>
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
