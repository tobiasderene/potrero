import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAnimales } from "@/features/animales/hooks/useAnimales"
import type { LoteRead, PotreroRead } from "@/types/api"
import { getApiError, useNacimiento, type NacimientoPayload } from "../hooks/useMovimientos"

interface Props {
  potreros: PotreroRead[]
  lotes: LoteRead[]
  onSuccess: (result: { evento_id: string }) => void
  onCancel: () => void
}

export function NacimientoForm({ potreros, lotes, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [fechaEvento, setFechaEvento] = useState(today)
  const [madreId, setMadreId] = useState("")
  const [padreId, setPadreId] = useState("")
  const [sexo, setSexo] = useState<"macho" | "hembra">("macho")
  const [fechaNacimiento, setFechaNacimiento] = useState(today)
  const [fechaEstimada] = useState(false)
  const [raza, setRaza] = useState("")
  const [numeroCampo, setNumeroCampo] = useState("")
  const [caravana, setCaravana] = useState("")
  const [potreroId, setPotreroId] = useState("")
  const [loteId, setLoteId] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useNacimiento()
  const { data: hembraData } = useAnimales({ estado: "activo" })
  const hembras = (hembraData?.items ?? []).filter((a) => a.sexo === "hembra")
  const machos = (hembraData?.items ?? []).filter((a) => a.sexo === "macho")

  function animalLabel(a: { caravana_senacsa: string | null; numero_campo: string | null }) {
    return a.caravana_senacsa ?? a.numero_campo ?? "—"
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!madreId) { setError("Debe seleccionar la madre"); return }
    if (!caravana.trim() && !numeroCampo.trim()) {
      setError("El ternero debe tener al menos caravana SENACSA o número de campo")
      return
    }

    const payload: NacimientoPayload = {
      fecha_evento: fechaEvento,
      madre_id: madreId,
      padre_id: padreId || null,
      sexo,
      fecha_nacimiento: fechaNacimiento,
      fecha_nacimiento_estimada: fechaEstimada,
      raza: raza.trim() || null,
      numero_campo: numeroCampo.trim() || null,
      caravana_senacsa: caravana.trim() || null,
      potrero_destino_id: potreroId || null,
      lote_destino_id: loteId || null,
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha del evento *</Label>
          <Input type="date" max={today} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de nacimiento *</Label>
          <Input type="date" max={today} value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Madre *</Label>
          <Select value={madreId || "__none__"} onValueChange={(v) => setMadreId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar madre..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Seleccionar —</SelectItem>
              {hembras.map((a) => (
                <SelectItem key={a.id} value={a.id}>{animalLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Padre (opcional)</Label>
          <Select value={padreId || "__none__"} onValueChange={(v) => setPadreId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Sin padre registrado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin padre</SelectItem>
              {machos.map((a) => (
                <SelectItem key={a.id} value={a.id}>{animalLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Sexo de la cría *</Label>
          <Select value={sexo} onValueChange={(v) => setSexo(v as "macho" | "hembra")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="macho">Macho (ternero)</SelectItem>
              <SelectItem value="hembra">Hembra (ternera)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Raza</Label>
          <Input placeholder="Nelore" value={raza} onChange={(e) => setRaza(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Caravana SENACSA</Label>
          <Input placeholder="PY000001" value={caravana} onChange={(e) => setCaravana(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>N° campo</Label>
          <Input placeholder="N001" value={numeroCampo} onChange={(e) => setNumeroCampo(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Potrero destino</Label>
          <Select value={potreroId || "__none__"} onValueChange={(v) => setPotreroId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Sin potrero" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin potrero</SelectItem>
              {potreros.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Lote destino</Label>
          <Select value={loteId || "__none__"} onValueChange={(v) => setLoteId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Sin lote" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin lote</SelectItem>
              {lotes.filter((l) => l.estado === "activo").map((l) => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input placeholder="Parto normal..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar nacimiento"}</Button>
      </div>
    </form>
  )
}
