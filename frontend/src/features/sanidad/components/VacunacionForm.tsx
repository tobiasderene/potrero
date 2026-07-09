import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getApiError, useRegistrarVacunacion } from "../hooks/useSanidad"
import type { LoteRead, VacunacionRead } from "@/types/api"

const VIAS = ["subcutanea", "intramuscular", "intravenosa", "oral", "topica"] as const

interface Props {
  lotes: LoteRead[]
  onSuccess: (result: VacunacionRead) => void
  onCancel: () => void
}

export function VacunacionForm({ lotes, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [fechaEvento, setFechaEvento] = useState(today)
  const [modo, setModo] = useState<"lote" | "individual">("lote")
  const [loteId, setLoteId] = useState("")
  const [animalIds, setAnimalIds] = useState("")
  const [biologico, setBiologico] = useState("")
  const [laboratorio, setLaboratorio] = useState("")
  const [loteBiologico, setLoteBiologico] = useState("")
  const [fechaVencBiol, setFechaVencBiol] = useState("")
  const [dosisMl, setDosisMl] = useState("")
  const [via, setVia] = useState("")
  const [esAntiaftosa, setEsAntiaftosa] = useState(false)
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useRegistrarVacunacion()
  const lotesActivos = lotes.filter((l) => l.estado === "activo")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!biologico.trim()) { setError("El nombre del biológico es obligatorio"); return }

    const payload: Parameters<typeof mutateAsync>[0] = {
      fecha_evento: fechaEvento,
      biologico: biologico.trim(),
      laboratorio: laboratorio || null,
      numero_lote_biologico: loteBiologico || null,
      fecha_vencimiento_biol: fechaVencBiol || null,
      dosis_ml: dosisMl ? Number(dosisMl) : null,
      via_administracion: via || null,
      es_antiaftosa: esAntiaftosa,
      observaciones: observaciones || null,
    }

    if (modo === "lote") {
      if (!loteId) { setError("Seleccione un lote"); return }
      payload.lote_id = loteId
    } else {
      const ids = animalIds.split(",").map((s) => s.trim()).filter(Boolean)
      if (ids.length === 0) { setError("Ingrese al menos un ID de animal"); return }
      payload.animal_ids = ids
    }

    try {
      const result = await mutateAsync(payload)
      onSuccess(result)
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={modo === "lote" ? "default" : "outline"}
          onClick={() => setModo("lote")}
        >
          Por lote
        </Button>
        <Button
          type="button"
          size="sm"
          variant={modo === "individual" ? "default" : "outline"}
          onClick={() => setModo("individual")}
        >
          Individual
        </Button>
      </div>

      {modo === "lote" ? (
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
      ) : (
        <div className="space-y-1.5">
          <Label>IDs de animales (separados por coma)</Label>
          <Input
            placeholder="uuid1, uuid2, ..."
            value={animalIds}
            onChange={(e) => setAnimalIds(e.target.value)}
          />
        </div>
      )}

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
        <Label>Biológico / Vacuna</Label>
        <Input
          placeholder="Ej: Aftovaxpur DOE"
          value={biologico}
          onChange={(e) => setBiologico(e.target.value)}
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="antiaftosa"
          checked={esAntiaftosa}
          onChange={(e) => setEsAntiaftosa(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="antiaftosa" className="text-sm font-medium">
          Es vacuna antiaftosa
        </label>
        {esAntiaftosa && <Badge variant="destructive" className="text-xs">SENACSA obligatoria</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Laboratorio</Label>
          <Input
            placeholder="Opcional"
            value={laboratorio}
            onChange={(e) => setLaboratorio(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lote del biológico</Label>
          <Input
            placeholder="N° de lote"
            value={loteBiologico}
            onChange={(e) => setLoteBiologico(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Vencimiento del biológico</Label>
          <Input
            type="date"
            value={fechaVencBiol}
            onChange={(e) => setFechaVencBiol(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Dosis (ml)</Label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="Ej: 2.0"
            value={dosisMl}
            onChange={(e) => setDosisMl(e.target.value)}
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
          {isPending ? "Registrando..." : "Registrar vacunación"}
        </Button>
      </div>
    </form>
  )
}
