import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiError, useRegistrarDiagnostico } from "../hooks/useSanidad"
import type { DiagnosticoRead } from "@/types/api"

interface Props {
  animalId: string
  onSuccess: (result: DiagnosticoRead) => void
  onCancel: () => void
}

export function DiagnosticoForm({ animalId, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [fechaEvento, setFechaEvento] = useState(today)
  const [descripcion, setDescripcion] = useState("")
  const [veterinario, setVeterinario] = useState("")
  const [conTratamiento, setConTratamiento] = useState(false)
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useRegistrarDiagnostico()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!descripcion.trim()) { setError("La descripción es obligatoria"); return }

    try {
      const result = await mutateAsync({
        fecha_evento: fechaEvento,
        animal_id: animalId,
        descripcion: descripcion.trim(),
        veterinario: veterinario || null,
        con_tratamiento: conTratamiento,
        observaciones: observaciones || null,
      })
      onSuccess(result)
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Fecha del evento</Label>
        <Input
          type="date"
          value={fechaEvento}
          max={today}
          onChange={(e) => setFechaEvento(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Descripción del diagnóstico</Label>
        <Input
          placeholder="Ej: Infección respiratoria leve"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Veterinario</Label>
        <Input
          placeholder="Nombre del veterinario (opcional)"
          value={veterinario}
          onChange={(e) => setVeterinario(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="con-tratamiento"
          checked={conTratamiento}
          onChange={(e) => setConTratamiento(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="con-tratamiento" className="text-sm font-medium">
          Requiere tratamiento
        </label>
      </div>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input
          placeholder="Opcional"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Registrando..." : "Registrar diagnóstico"}
        </Button>
      </div>
    </form>
  )
}
