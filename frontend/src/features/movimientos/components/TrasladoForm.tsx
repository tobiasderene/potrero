import { useState } from "react"
import { CheckCircle2, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAnimales } from "@/features/animales/hooks/useAnimales"
import type { PotreroRead } from "@/types/api"
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
  const [busqueda, setBusqueda] = useState("")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useTraslado()
  const { data } = useAnimales({ estado: "activo" })
  const animales = data?.items ?? []

  const filtrados = animales.filter((a) => {
    const q = busqueda.toLowerCase()
    return (
      !q ||
      a.caravana_senacsa?.toLowerCase().includes(q) ||
      a.numero_campo?.toLowerCase().includes(q)
    )
  })

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function animalLabel(a: { caravana_senacsa: string | null; numero_campo: string | null; categoria_actual?: string | null }) {
    const id = a.caravana_senacsa ?? a.numero_campo ?? "—"
    const cat = a.categoria_actual ? ` — ${a.categoria_actual.replace(/_/g, " ")}` : ""
    return id + cat
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (seleccionados.size === 0) { setError("Debe seleccionar al menos un animal"); return }
    if (!potreroId) { setError("Debe seleccionar el potrero destino"); return }

    const payload: TrasladoPayload = {
      fecha_evento: fechaEvento,
      animal_ids: Array.from(seleccionados),
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Animales a trasladar * ({seleccionados.size} seleccionados)</Label>
          {seleccionados.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSeleccionados(new Set())}>
              <X className="h-3.5 w-3.5 mr-1" /> Limpiar
            </Button>
          )}
        </div>
        <Input
          placeholder="Buscar por caravana o número de campo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="rounded-md border max-h-56 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            filtrados.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 transition-colors ${
                  seleccionados.has(a.id) ? "bg-primary/5" : ""
                }`}
                onClick={() => toggle(a.id)}
              >
                {seleccionados.has(a.id) ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border shrink-0" />
                )}
                <span>{animalLabel(a)}</span>
              </button>
            ))
          )}
        </div>
      </div>

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
