import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AnimalMultiSearchSelect } from "@/components/AnimalMultiSearchSelect"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import type { AnimalRead, PotreroRead } from "@/types/api"
import { getApiError, useTraslado, type TrasladoPayload } from "../hooks/useMovimientos"

interface Props {
  potreros: PotreroRead[]
  onSuccess: (result: { evento_id: string; advertencias: string[] }) => void
  onCancel: () => void
}

type Modo = "animales" | "lote"

export function TrasladoForm({ potreros, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [modo, setModo] = useState<Modo>("animales")
  const [fechaEvento, setFechaEvento] = useState(today)
  const [potreroId, setPotreroId] = useState("")
  const [seleccionados, setSeleccionados] = useState<Map<string, AnimalRead>>(new Map())
  const [loteId, setLoteId] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useTraslado()
  const { data: lotesData } = useLotes("activo")

  const loteSeleccionado = lotesData?.items.find(l => l.id === loteId)

  function toggleAnimal(a: AnimalRead) {
    setSeleccionados((prev) => {
      const next = new Map(prev)
      if (next.has(a.id)) next.delete(a.id)
      else next.set(a.id, a)
      return next
    })
  }

  function cambiarModo(m: Modo) {
    setModo(m)
    setError(null)
    setSeleccionados(new Map())
    setLoteId("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!potreroId) { setError("Debe seleccionar el potrero destino"); return }

    let payload: TrasladoPayload

    if (modo === "animales") {
      if (seleccionados.size === 0) { setError("Debe seleccionar al menos un animal"); return }
      payload = {
        fecha_evento: fechaEvento,
        animal_ids: Array.from(seleccionados.keys()),
        potrero_destino_id: potreroId,
        observaciones: observaciones.trim() || null,
      }
    } else {
      if (!loteId) { setError("Debe seleccionar un lote"); return }
      payload = {
        fecha_evento: fechaEvento,
        lote_id: loteId,
        potrero_destino_id: potreroId,
        observaciones: observaciones.trim() || null,
      }
    }

    try {
      const result = await mutateAsync(payload)
      onSuccess({ evento_id: result.evento_id, advertencias: result.advertencias })
    } catch (err) {
      setError(getApiError(err))
    }
  }

  const botonLabel = () => {
    if (isPending) return "Registrando..."
    if (modo === "lote") {
      const n = loteSeleccionado?.total_animales ?? 0
      return loteId ? `Trasladar lote (${n} animal${n !== 1 ? "es" : ""})` : "Trasladar lote"
    }
    const n = seleccionados.size
    return `Trasladar ${n} animal${n !== 1 ? "es" : ""}`
  }

  const submitDisabled = isPending || (modo === "animales" ? seleccionados.size === 0 : !loteId)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Toggle modo */}
      <div className="space-y-1.5">
        <Label>Trasladar</Label>
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {(["animales", "lote"] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => cambiarModo(m)}
              className={[
                "flex-1 rounded px-3 py-1.5 text-sm transition-colors duration-150",
                modo === m
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {m === "animales" ? "Animales individuales" : "Lote completo"}
            </button>
          ))}
        </div>
      </div>

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

      {modo === "animales" ? (
        <AnimalMultiSearchSelect
          label="Animales a trasladar"
          selected={seleccionados}
          onToggle={toggleAnimal}
          onClear={() => setSeleccionados(new Map())}
        />
      ) : (
        <div className="space-y-1.5">
          <Label>Lote a trasladar *</Label>
          <Select value={loteId || "__none__"} onValueChange={(v) => setLoteId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar lote..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Seleccionar —</SelectItem>
              {lotesData?.items.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nombre}
                  <span className="text-muted-foreground ml-1.5 capitalize">· {l.proposito}</span>
                </SelectItem>
              ))}
              {!lotesData?.items.length && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No hay lotes activos</div>
              )}
            </SelectContent>
          </Select>
          {loteSeleccionado && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs">{loteSeleccionado.total_animales} animales</Badge>
              serán trasladados al potrero seleccionado
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input placeholder="Motivo del traslado..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={submitDisabled}>{botonLabel()}</Button>
      </div>
    </form>
  )
}
