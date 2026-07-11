import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnimalSearchSelect } from "@/features/pesajes/components/AnimalSearchSelect"
import type { AnimalRead } from "@/types/api"
import { getApiError, useEgresoMuerte, type EgresoMuertePayload } from "../hooks/useMovimientos"

interface Props {
  onSuccess: (result: { evento_id: string }) => void
  onCancel: () => void
}

export function EgresoMuerteForm({ onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [fechaEvento, setFechaEvento] = useState(today)
  const [animalSeleccionado, setAnimalSeleccionado] = useState<AnimalRead | null>(null)
  const [causa, setCausa] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useEgresoMuerte()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!animalSeleccionado) { setError("Debe seleccionar el animal"); return }

    const payload: EgresoMuertePayload = {
      fecha_evento: fechaEvento,
      animal_id: animalSeleccionado.id,
      causa_muerte: causa.trim() || null,
      observaciones: observaciones.trim() || null,
    }

    try {
      const result = await mutateAsync(payload)
      onSuccess({ evento_id: result.evento_id })
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Alert>
        <AlertDescription>
          Esta acción registra la baja del animal por muerte. Es irreversible.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha del evento *</Label>
          <Input type="date" max={today} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Animal *</Label>
          {!animalSeleccionado ? (
            <AnimalSearchSelect onSelect={setAnimalSeleccionado} />
          ) : (
            <div className="rounded-md bg-muted px-3 py-2 flex items-center justify-between text-sm">
              <div>
                <span className="font-mono font-medium">
                  {animalSeleccionado.caravana_senacsa ?? animalSeleccionado.numero_campo}
                </span>
                <span className="text-muted-foreground ml-2 capitalize">
                  {animalSeleccionado.categoria_actual?.replace(/_/g, " ") ?? ""}
                </span>
                {animalSeleccionado.lote_actual_nombre && (
                  <span className="text-muted-foreground"> · {animalSeleccionado.lote_actual_nombre}</span>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setAnimalSeleccionado(null)}
              >
                cambiar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Causa de muerte</Label>
          <Input
            placeholder="Ej: Timpanismo, accidente, enfermedad..."
            value={causa}
            onChange={(e) => setCausa(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input placeholder="Notas adicionales..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="destructive" disabled={isPending || !animalSeleccionado}>
          {isPending ? "Registrando..." : "Registrar muerte"}
        </Button>
      </div>
    </form>
  )
}
