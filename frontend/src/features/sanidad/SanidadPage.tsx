import { useState } from "react"
import { Syringe, Pill, Stethoscope } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VacunacionForm } from "./components/VacunacionForm"
import { TratamientoForm } from "./components/TratamientoForm"
import { DiagnosticoForm } from "./components/DiagnosticoForm"
import { useLotes } from "@/features/lotes/hooks/useLotes"

export function SanidadPage() {
  const [showVacunacion, setShowVacunacion] = useState(false)
  const [showTratamiento, setShowTratamiento] = useState(false)
  const [showDiagnostico, setShowDiagnostico] = useState(false)
  const [animalId, setAnimalId] = useState("")
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
          onClick={() => { setAnimalId(""); setShowTratamiento(true) }}
          className="rounded-lg border p-5 text-left hover:bg-muted/50 transition-colors space-y-2"
        >
          <Pill className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-sm">Tratamiento</p>
          <p className="text-xs text-muted-foreground">Con cálculo de carencia</p>
        </button>
        <button
          onClick={() => { setAnimalId(""); setShowDiagnostico(true) }}
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
      <Dialog open={showTratamiento} onOpenChange={setShowTratamiento}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar tratamiento veterinario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ID del animal</Label>
              <Input
                placeholder="UUID del animal"
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
              />
            </div>
            {animalId && (
              <TratamientoForm
                animalId={animalId}
                onSuccess={(r) => {
                  const carencia = r.dias_carencia > 0
                    ? ` · Carencia hasta ${r.fecha_fin_carencia}`
                    : " · Sin período de carencia"
                  setLastResult(`Tratamiento registrado · ${r.medicamento}${carencia}`)
                  setShowTratamiento(false)
                  setAnimalId("")
                }}
                onCancel={() => { setShowTratamiento(false); setAnimalId("") }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diagnóstico */}
      <Dialog open={showDiagnostico} onOpenChange={setShowDiagnostico}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar diagnóstico veterinario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ID del animal</Label>
              <Input
                placeholder="UUID del animal"
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
              />
            </div>
            {animalId && (
              <DiagnosticoForm
                animalId={animalId}
                onSuccess={(r) => {
                  setLastResult(`Diagnóstico registrado · ${r.descripcion}`)
                  setShowDiagnostico(false)
                  setAnimalId("")
                }}
                onCancel={() => { setShowDiagnostico(false); setAnimalId("") }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
