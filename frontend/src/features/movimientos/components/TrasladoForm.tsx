import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimalMultiSearchSelect } from "@/components/AnimalMultiSearchSelect"
import type { AnimalRead, PotreroRead } from "@/types/api"
import { getApiError, useTraslado, type TrasladoPayload } from "../hooks/useMovimientos"

interface Props {
  potreros: PotreroRead[]
  onSuccess: (result: { evento_id: string; advertencias: string[] }) => void
  onCancel: () => void
}

export function TrasladoForm({ potreros, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [fechaEvento, setFechaEvento] = useState(today)
  const [potreroId, setPotreroId] = useState("")
  const [seleccionados, setSeleccionados] = useState<Map<string, AnimalRead>>(new Map())
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useTraslado()

  function toggleAnimal(a: AnimalRead) {
    setSeleccionados((prev) => {
      const next = new Map(prev)
      if (next.has(a.id)) next.delete(a.id)
      else next.set(a.id, a)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (seleccionados.size === 0) { setError("Debe seleccionar al menos un animal"); return }
    if (!potreroId) { setError("Debe seleccionar el potrero destino"); return }

    const payload: TrasladoPayload = {
      fecha_evento: fechaEvento,
      animal_ids: Array.from(seleccionados.keys()),
      potrero_destino_id: potreroId,
      observaciones: observaciones.trim() || null,
    }

    try {
      const result = await mutateAsync(payload)
      onSuccess({ evento_id: result.evento_id, advertencias: result.advertencias })
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha del evento *</Label>
          <Input type="date" max={today} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Potrero destino *</Label>
          <Select value={potreroId || "__none__"} onValueChange={(v) => setPotreroId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar potrero..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Seleccionar —</SelectItem>
              {potreros.filter((p) => p.estado === "activo").map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimalMultiSearchSelect
        label="Animales a trasladar"
        selected={seleccionados}
        onToggle={toggleAnimal}
        onClear={() => setSeleccionados(new Map())}
      />

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input placeholder="Motivo del traslado..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || seleccionados.size === 0}>
          {isPending ? "Registrando..." : `Trasladar ${seleccionados.size} animal${seleccionados.size !== 1 ? "es" : ""}`}
        </Button>
      </div>
    </form>
  )
}
