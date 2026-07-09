import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { getApiError, useRegistrarPesajeIndividual } from "../hooks/usePesajes"
import type { PesajeRead } from "@/types/api"

interface Props {
  animalId: string
  onSuccess: (result: PesajeRead) => void
  onCancel: () => void
}

export function PesajeIndividualForm({ animalId, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [fechaEvento, setFechaEvento] = useState(today)
  const [pesoKg, setPesoKg] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [gdpResult, setGdpResult] = useState<{ gdp: string | null; dias: number | null } | null>(null)

  const { mutateAsync, isPending } = useRegistrarPesajeIndividual()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setGdpResult(null)

    if (!pesoKg || Number(pesoKg) <= 0) {
      setError("El peso debe ser mayor a 0")
      return
    }

    try {
      const result = await mutateAsync({
        fecha_evento: fechaEvento,
        animal_id: animalId,
        peso_kg: Number(pesoKg),
        observaciones: observaciones || null,
      })
      setGdpResult({ gdp: result.gdp_g_dia, dias: result.dias_intervalo })
      onSuccess(result)
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="space-y-1.5">
        <Label>Peso (kg)</Label>
        <Input
          type="number"
          step="0.1"
          min="1"
          placeholder="Ej: 380.5"
          value={pesoKg}
          onChange={(e) => setPesoKg(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input
          placeholder="Opcional"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {gdpResult && (
        <div className="rounded-md bg-muted p-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">GDP calculado:</span>
          {gdpResult.gdp ? (
            <Badge variant="secondary">
              {Number(gdpResult.gdp).toFixed(0)} g/día
              {gdpResult.dias ? ` · ${gdpResult.dias} días` : ""}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Sin dato suficiente (primer pesaje)</span>
          )}
        </div>
      )}

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
          {isPending ? "Guardando..." : "Registrar pesaje"}
        </Button>
      </div>
    </form>
  )
}
