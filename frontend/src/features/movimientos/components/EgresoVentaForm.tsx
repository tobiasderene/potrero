import { useState } from "react"
import { CheckCircle2, ShieldAlert, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAnimales } from "@/features/animales/hooks/useAnimales"
import type { AnimalRead } from "@/types/api"
import { getApiError, useEgresoVenta, type EgresoVentaPayload } from "../hooks/useMovimientos"

interface CarenciaDetail {
  animal_id: string
  fecha_fin_carencia: string
  medicamento: string
}

interface Props {
  onSuccess: (result: { evento_id: string }) => void
  onCancel: () => void
}

export function EgresoVentaForm({ onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [fechaEvento, setFechaEvento] = useState(today)
  const [comprador, setComprador] = useState("")
  const [destino, setDestino] = useState<"frigorifico" | "remate" | "venta_directa">("frigorifico")
  const [precio, setPrecio] = useState("")
  const [pesoVenta, setPesoVenta] = useState("")
  const [moneda, setMoneda] = useState<"PYG" | "USD">("PYG")
  const [guia, setGuia] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [carenciasBloqueo, setCarenciasBloqueo] = useState<CarenciaDetail[]>([])

  const { mutateAsync, isPending } = useEgresoVenta()
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
    setCarenciasBloqueo([])
    setError(null)
  }

  function animalLabel(a: AnimalRead) {
    const id = a.caravana_senacsa ?? a.numero_campo ?? "—"
    const cat = a.categoria_actual ? ` — ${a.categoria_actual.replace(/_/g, " ")}` : ""
    return id + cat
  }

  function sinCaravana(a: AnimalRead) {
    return !a.caravana_senacsa
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCarenciasBloqueo([])

    if (seleccionados.size === 0) { setError("Debe seleccionar al menos un animal"); return }

    const payload: EgresoVentaPayload = {
      fecha_evento: fechaEvento,
      animal_ids: Array.from(seleccionados),
      comprador: comprador.trim() || null,
      destino_venta: destino || null,
      precio_venta_unitario: precio ? parseFloat(precio) : null,
      peso_venta_promedio_kg: pesoVenta ? parseFloat(pesoVenta) : null,
      moneda,
      numero_guia_senacsa: guia.trim() || null,
      observaciones: observaciones.trim() || null,
    }

    try {
      const result = await mutateAsync(payload)
      onSuccess({ evento_id: result.evento_id })
    } catch (err: any) {
      if (err?.response?.data?.detail?.animales_con_carencia) {
        setCarenciasBloqueo(err.response.data.detail.animales_con_carencia)
        setError("Venta bloqueada — hay animales con carencia sanitaria activa (RN-06)")
      } else if (err?.response?.data?.detail?.mensaje) {
        setError(err.response.data.detail.mensaje)
      } else {
        setError(getApiError(err))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {carenciasBloqueo.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-2">
          <p className="text-sm font-semibold text-destructive">Animales bloqueados por carencia</p>
          {carenciasBloqueo.map((c) => (
            <div key={c.animal_id} className="text-xs text-muted-foreground">
              ID: {c.animal_id.slice(0, 8)}... — {c.medicamento} — libre el {c.fecha_fin_carencia}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha del evento *</Label>
          <Input type="date" max={today} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Destino de venta</Label>
          <Select value={destino} onValueChange={(v) => setDestino(v as typeof destino)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="frigorifico">Frigorífico</SelectItem>
              <SelectItem value="remate">Remate</SelectItem>
              <SelectItem value="venta_directa">Venta directa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Comprador</Label>
          <Input placeholder="Frigorífico X" value={comprador} onChange={(e) => setComprador(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Guía SENACSA</Label>
          <Input placeholder="G-2025-002" value={guia} onChange={(e) => setGuia(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Precio unitario</Label>
          <Input type="number" step="0.01" min="0" placeholder="600000" value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Peso prom. venta (kg)</Label>
          <Input type="number" step="0.1" min="0" placeholder="380" value={pesoVenta} onChange={(e) => setPesoVenta(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={moneda} onValueChange={(v) => setMoneda(v as "PYG" | "USD")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PYG">Guaraníes (PYG)</SelectItem>
              <SelectItem value="USD">Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Animales a vender * ({seleccionados.size} seleccionados)</Label>
          {seleccionados.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSeleccionados(new Set()); setCarenciasBloqueo([]); setError(null) }}>
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
                } ${sinCaravana(a) ? "opacity-60" : ""}`}
                onClick={() => toggle(a.id)}
              >
                {seleccionados.has(a.id) ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border shrink-0" />
                )}
                <span className="flex-1">{animalLabel(a)}</span>
                {sinCaravana(a) && (
                  <Badge variant="destructive" className="text-xs h-5">Sin caravana</Badge>
                )}
              </button>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Todos los animales deben tener caravana SENACSA para egresos externos (RN-04)
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input placeholder="Notas adicionales..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || seleccionados.size === 0}>
          {isPending ? "Registrando..." : `Registrar venta (${seleccionados.size} animal${seleccionados.size !== 1 ? "es" : ""})`}
        </Button>
      </div>
    </form>
  )
}
