import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LoteRead, PotreroRead } from "@/types/api"
import { getApiError, useIngresoCompra, type AnimalCompraItem, type IngresoCompraPayload } from "../hooks/useMovimientos"

const CATEGORIAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]

interface AnimalForm {
  caravana_senacsa: string
  numero_campo: string
  sexo: "macho" | "hembra"
  categoria: string
  raza: string
  fecha_nacimiento: string
  peso_kg: string
}

const EMPTY_ANIMAL: AnimalForm = {
  caravana_senacsa: "",
  numero_campo: "",
  sexo: "macho",
  categoria: "novillo",
  raza: "",
  fecha_nacimiento: "",
  peso_kg: "",
}

interface Props {
  potreros: PotreroRead[]
  lotes: LoteRead[]
  onSuccess: (result: { evento_id: string; animal_ids: string[] }) => void
  onCancel: () => void
}

export function IngresoCompraForm({ potreros, lotes, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [fechaEvento, setFechaEvento] = useState(today)
  const [potreroId, setPotreroId] = useState("")
  const [loteId, setLoteId] = useState("")
  const [proveedor, setProveedor] = useState("")
  const [estOrigen, setEstOrigen] = useState("")
  const [guia, setGuia] = useState("")
  const [precio, setPrecio] = useState("")
  const [tipoPrecio] = useState<"por_cabeza" | "por_kg">("por_cabeza")
  const [moneda, setMoneda] = useState<"PYG" | "USD">("PYG")
  const [observaciones, setObservaciones] = useState("")
  const [animales, setAnimales] = useState<AnimalForm[]>([{ ...EMPTY_ANIMAL }])
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useIngresoCompra()

  function addAnimal() {
    setAnimales((prev) => [...prev, { ...EMPTY_ANIMAL }])
  }

  function removeAnimal(i: number) {
    setAnimales((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateAnimal(i: number, field: keyof AnimalForm, value: string) {
    setAnimales((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    for (const a of animales) {
      if (!a.caravana_senacsa.trim() && !a.numero_campo.trim()) {
        setError("Cada animal debe tener al menos caravana SENACSA o número de campo")
        return
      }
    }

    const payload: IngresoCompraPayload = {
      fecha_evento: fechaEvento,
      animales: animales.map((a): AnimalCompraItem => ({
        caravana_senacsa: a.caravana_senacsa.trim() || null,
        numero_campo: a.numero_campo.trim() || null,
        sexo: a.sexo,
        categoria: a.categoria,
        raza: a.raza.trim() || null,
        fecha_nacimiento: a.fecha_nacimiento || null,
        peso_kg: a.peso_kg ? parseFloat(a.peso_kg) : null,
      })),
      potrero_destino_id: potreroId || null,
      lote_destino_id: loteId || null,
      proveedor: proveedor.trim() || null,
      establecimiento_origen: estOrigen.trim() || null,
      numero_guia_senacsa: guia.trim() || null,
      precio_unitario: precio ? parseFloat(precio) : null,
      tipo_precio: precio ? tipoPrecio : null,
      moneda: precio ? moneda : null,
      observaciones: observaciones.trim() || null,
    }

    try {
      const result = await mutateAsync(payload)
      onSuccess({ evento_id: result.evento_id, animal_ids: result.animal_ids })
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha del evento *</Label>
          <Input type="date" max={today} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <Input placeholder="Estancia Don José" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Establecimiento origen</Label>
          <Input placeholder="San Pedro" value={estOrigen} onChange={(e) => setEstOrigen(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Guía SENACSA</Label>
          <Input placeholder="G-2025-001" value={guia} onChange={(e) => setGuia(e.target.value)} />
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

        <div className="space-y-1.5">
          <Label>Precio unitario</Label>
          <Input type="number" step="0.01" min="0" placeholder="500000" value={precio} onChange={(e) => setPrecio(e.target.value)} />
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Animales <Badge variant="secondary">{animales.length}</Badge>
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addAnimal}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar animal
          </Button>
        </div>

        {animales.map((a, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Animal #{i + 1}</span>
              {animales.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAnimal(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Caravana SENACSA</Label>
                <Input placeholder="PY000001" value={a.caravana_senacsa} onChange={(e) => updateAnimal(i, "caravana_senacsa", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">N° campo</Label>
                <Input placeholder="A001" value={a.numero_campo} onChange={(e) => updateAnimal(i, "numero_campo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sexo</Label>
                <Select value={a.sexo} onValueChange={(v) => updateAnimal(i, "sexo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macho">Macho</SelectItem>
                    <SelectItem value="hembra">Hembra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <Select value={a.categoria} onValueChange={(v) => updateAnimal(i, "categoria", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Raza</Label>
                <Input placeholder="Nelore" value={a.raza} onChange={(e) => updateAnimal(i, "raza", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso (kg)</Label>
                <Input type="number" step="0.1" min="0" placeholder="250" value={a.peso_kg} onChange={(e) => updateAnimal(i, "peso_kg", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Input placeholder="Notas adicionales..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Registrando..." : `Registrar compra (${animales.length} animal${animales.length !== 1 ? "es" : ""})`}
        </Button>
      </div>
    </form>
  )
}
