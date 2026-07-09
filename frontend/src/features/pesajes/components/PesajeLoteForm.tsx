import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getApiError, useRegistrarPesajeLote } from "../hooks/usePesajes"
import type { LoteRead, PesajeRead } from "@/types/api"

interface Props {
  lotes: LoteRead[]
  onSuccess: (result: PesajeRead) => void
  onCancel: () => void
}

export function PesajeLoteForm({ lotes, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [fechaEvento, setFechaEvento] = useState(today)
  const [loteId, setLoteId] = useState("")
  const [pesoKg, setPesoKg] = useState("")
  const [cantidadMuestra, setCantidadMuestra] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useRegistrarPesajeLote()

  const lotesActivos = lotes.filter((l) => l.estado === "activo")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!loteId) { setError("Seleccione un lote"); return }
    if (!pesoKg || Number(pesoKg) <= 0) { setError("El peso promedio debe ser mayor a 0"); return }
    if (!cantidadMuestra || Number(cantidadMuestra) < 1) { setError("La muestra debe ser al menos 1 animal"); return }

    try {
      const result = await mutateAsync({
        fecha_evento: fechaEvento,
        lote_id: loteId,
        peso_kg: Number(pesoKg),
        cantidad_muestra: Number(cantidadMuestra),
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
        <Label>Lote</Label>
        <Select value={loteId} onValueChange={setLoteId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar lote..." />
          </SelectTrigger>
          <SelectContent>
            {lotesActivos.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Fecha del pesaje</Label>
        <Input
          type="date"
          value={fechaEvento}
          max={today}
          onChange={(e) => setFechaEvento(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Peso promedio (kg)</Label>
          <Input
            type="number"
            step="0.1"
            min="1"
            placeholder="Ej: 350.0"
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tamaño de muestra</Label>
          <Input
            type="number"
            min="1"
            placeholder="N° animales pesados"
            value={cantidadMuestra}
            onChange={(e) => setCantidadMuestra(e.target.value)}
            required
          />
        </div>
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
        <Button type="submit" disabled={isPending || !loteId}>
          {isPending ? "Guardando..." : "Registrar pesaje de lote"}
        </Button>
      </div>
    </form>
  )
}
