import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getApiError, useRegistrarTratamiento } from "../hooks/useSanidad"
import type { TratamientoRead } from "@/types/api"

const VIAS = ["subcutanea", "intramuscular", "intravenosa", "oral", "topica"] as const

interface Props {
  animalId: string
  onSuccess: (result: TratamientoRead) => void
  onCancel: () => void
}

export function TratamientoForm({ animalId, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [fechaEvento, setFechaEvento] = useState(today)
  const [medicamento, setMedicamento] = useState("")
  const [diagnostico, setDiagnostico] = useState("")
  const [dosis, setDosis] = useState("")
  const [via, setVia] = useState("")
  const [duracionDias, setDuracionDias] = useState("")
  const [diasCarencia, setDiasCarencia] = useState("0")
  const [veterinario, setVeterinario] = useState("")
  const [costo, setCosto] = useState("")
  const [monedaCosto, setMonedaCosto] = useState<"PYG" | "USD">("PYG")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useRegistrarTratamiento()

  const fechaFinCarencia = diasCarencia && fechaEvento
    ? (() => {
        const d = new Date(fechaEvento)
        d.setDate(d.getDate() + Number(diasCarencia))
        return d.toISOString().slice(0, 10)
      })()
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!medicamento.trim()) { setError("El medicamento es obligatorio"); return }

    try {
      const result = await mutateAsync({
        fecha_evento: fechaEvento,
        animal_id: animalId,
        medicamento: medicamento.trim(),
        diagnostico: diagnostico || null,
        dosis: dosis || null,
        via_administracion: via || null,
        duracion_dias: duracionDias ? Number(duracionDias) : null,
        dias_carencia: Number(diasCarencia),
        veterinario: veterinario || null,
        costo: costo ? Number(costo) : null,
        moneda_costo: costo ? monedaCosto : null,
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
        <Label>Medicamento</Label>
        <Input
          placeholder="Ej: Ivermectina 1%"
          value={medicamento}
          onChange={(e) => setMedicamento(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Diagnóstico</Label>
        <Input
          placeholder="Opcional"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Dosis</Label>
          <Input
            placeholder="Ej: 1 ml/50 kg"
            value={dosis}
            onChange={(e) => setDosis(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Duración del tratamiento (días)</Label>
          <Input
            type="number"
            min="1"
            placeholder="Ej: 5"
            value={duracionDias}
            onChange={(e) => setDuracionDias(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Vía de administración</Label>
        <Select value={via} onValueChange={setVia}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {VIAS.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Días de carencia (RN-07)</Label>
          {fechaFinCarencia && Number(diasCarencia) > 0 && (
            <Badge variant="destructive" className="text-xs">
              Fin carencia: {fechaFinCarencia}
            </Badge>
          )}
        </div>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={diasCarencia}
          onChange={(e) => setDiasCarencia(e.target.value)}
        />
        {Number(diasCarencia) > 0 && (
          <p className="text-xs text-amber-600">
            Este animal no podrá venderse hasta el {fechaFinCarencia}.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Veterinario</Label>
        <Input
          placeholder="Nombre del veterinario (opcional)"
          value={veterinario}
          onChange={(e) => setVeterinario(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Costo</Label>
          <Input
            type="number"
            min="0"
            placeholder="Opcional"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={monedaCosto} onValueChange={(v: "PYG" | "USD") => setMonedaCosto(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PYG">PYG</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "Registrando..." : "Registrar tratamiento"}
        </Button>
      </div>
    </form>
  )
}
