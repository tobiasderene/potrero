import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAnimales } from "@/features/animales/hooks/useAnimales"
import { getApiError, useEgresoMuerte, type EgresoMuertePayload } from "../hooks/useMovimientos"

interface Props {
  onSuccess: (result: { evento_id: string }) => void
  onCancel: () => void
}

export function EgresoMuerteForm({ onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [fechaEvento, setFechaEvento] = useState(today)
  const [animalId, setAnimalId] = useState("")
  const [causa, setCausa] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useEgresoMuerte()
  const { data } = useAnimales({ estado: "activo" })
  const animales = data?.items ?? []

  function animalLabel(a: { caravana_senacsa: string | null; numero_campo: string | null; categoria_actual?: string | null }) {
    const id = a.caravana_senacsa ?? a.numero_campo ?? "—"
    const cat = a.categoria_actual ? ` — ${a.categoria_actual.replace(/_/g, " ")}` : ""
    return id + cat
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!animalId) { setError("Debe seleccionar el animal"); return }

    const payload: EgresoMuertePayload = {
      fecha_evento: fechaEvento,
      animal_id: animalId,
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
          <Select value={animalId || "__none__"} onValueChange={(v) => setAnimalId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar animal..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Seleccionar —</SelectItem>
              {animales.map((a) => (
                <SelectItem key={a.id} value={a.id}>{animalLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button type="submit" variant="destructive" disabled={isPending || !animalId}>
          {isPending ? "Registrando..." : "Registrar muerte"}
        </Button>
      </div>
    </form>
  )
}
