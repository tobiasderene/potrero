import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Plus } from "lucide-react"
import type { CargaAnimalRead, PotreroRead } from "@/types/api"
import { getApiError, useCreatePotrero, usePotreros, usePotrerosCarga, useUpdatePotrero } from "./hooks/usePotreros"

type EstadoFilter = "todos" | "activo" | "en_descanso" | "en_recuperacion" | "archivado"

const ESTADOS: { value: EstadoFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "activo", label: "Activos" },
  { value: "en_descanso", label: "En descanso" },
  { value: "en_recuperacion", label: "En recuperación" },
  { value: "archivado", label: "Archivados" },
]

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  en_descanso: "En descanso",
  en_recuperacion: "En recuperación",
  archivado: "Archivado",
}

const ESTADO_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  activo: "default",
  en_descanso: "secondary",
  en_recuperacion: "secondary",
  archivado: "outline",
}

interface PotreroForm {
  nombre: string
  superficie_ha: string
  tipo_pastura: string
  capacidad_max_ug_ha: string
}

const EMPTY_FORM: PotreroForm = { nombre: "", superficie_ha: "", tipo_pastura: "", capacidad_max_ug_ha: "" }

function formFromPotrero(p: PotreroRead): PotreroForm {
  return {
    nombre: p.nombre,
    superficie_ha: p.superficie_ha ?? "",
    tipo_pastura: p.tipo_pastura ?? "",
    capacidad_max_ug_ha: p.capacidad_max_ug_ha ?? "",
  }
}

function toPayload(form: PotreroForm) {
  return {
    nombre: form.nombre.trim(),
    superficie_ha: form.superficie_ha ? parseFloat(form.superficie_ha) : null,
    tipo_pastura: form.tipo_pastura.trim() || null,
    capacidad_max_ug_ha: form.capacidad_max_ug_ha ? parseFloat(form.capacidad_max_ug_ha) : null,
  }
}

function PotreroFormFields({ form, onChange }: { form: PotreroForm; onChange: (f: PotreroForm) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nombre *</Label>
        <Input
          placeholder="Potrero Norte"
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Superficie (ha)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="250.00"
          value={form.superficie_ha}
          onChange={(e) => onChange({ ...form, superficie_ha: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Cap. máx. (UG/ha)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.80"
          value={form.capacidad_max_ug_ha}
          onChange={(e) => onChange({ ...form, capacidad_max_ug_ha: e.target.value })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Tipo de pastura</Label>
        <Input
          placeholder="Brachiaria, Panicum..."
          value={form.tipo_pastura}
          onChange={(e) => onChange({ ...form, tipo_pastura: e.target.value })}
        />
      </div>
    </div>
  )
}

function CreatePotreroCard({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState<PotreroForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useCreatePotrero()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    try {
      await mutateAsync(toPayload(form))
      onCancel()
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Nuevo potrero</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <PotreroFormFields form={form} onChange={setForm} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

const ESTADOS_POTRERO = ["activo", "en_descanso", "en_recuperacion", "archivado"] as const

const SEMAFORO_COLOR: Record<string, string> = {
  verde: "bg-green-500",
  amarillo: "bg-yellow-400",
  rojo: "bg-red-500",
}

function CargaBar({ carga }: { carga: CargaAnimalRead }) {
  if (carga.estado_carga === "sin_dato_suficiente") return null
  const pct = parseFloat(carga.porcentaje_ocupacion ?? "0")
  const colorClass = carga.semaforo ? SEMAFORO_COLOR[carga.semaforo] : "bg-gray-300"
  const pctCapped = Math.min(pct, 150)

  return (
    <div className="pt-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {carga.total_animales} animales · {parseFloat(carga.carga_actual_ug).toFixed(1)} UG
        </span>
        <div className="flex items-center gap-1.5">
          {carga.semaforo && (
            <span className={`inline-block w-2 h-2 rounded-full ${colorClass}`} />
          )}
          <span className="font-medium">
            {carga.porcentaje_ocupacion !== null
              ? `${parseFloat(carga.porcentaje_ocupacion).toFixed(0)}%`
              : carga.estado_carga === "parcial"
              ? "parcial"
              : "—"}
          </span>
        </div>
      </div>
      {pct > 0 && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colorClass}`}
            style={{ width: `${Math.min((pctCapped / 150) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function PotreroCard({ potrero, carga }: { potrero: PotreroRead; carga?: CargaAnimalRead }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PotreroForm>(formFromPotrero(potrero))
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useUpdatePotrero()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    try {
      await mutateAsync({ id: potrero.id, ...toPayload(form) })
      setEditing(false)
    } catch (err) {
      setError(getApiError(err))
    }
  }

  async function handleEstado(estado: string) {
    try {
      await mutateAsync({ id: potrero.id, estado })
    } catch (err) {
      setError(getApiError(err))
    }
  }

  function cancelEdit() {
    setForm(formFromPotrero(potrero))
    setError(null)
    setEditing(false)
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <div className="flex flex-wrap gap-1.5">
                {ESTADOS_POTRERO.map((e) => (
                  <Button
                    key={e}
                    type="button"
                    size="sm"
                    variant={potrero.estado === e ? "default" : "outline"}
                    className="text-xs h-7"
                    disabled={isPending}
                    onClick={() => handleEstado(e)}
                  >
                    {ESTADO_LABELS[e]}
                  </Button>
                ))}
              </div>
            </div>
            <PotreroFormFields form={form} onChange={setForm} />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-tight">{potrero.nombre}</p>
                <Badge variant={ESTADO_BADGE[potrero.estado]} className="mt-1.5 text-xs">
                  {ESTADO_LABELS[potrero.estado]}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm pt-1">
              <div>
                <p className="text-xs font-medium text-foreground">Superficie</p>
                <p className="text-muted-foreground">
                  {potrero.superficie_ha ? `${potrero.superficie_ha} ha` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Cap. máx.</p>
                <p className="text-muted-foreground">
                  {potrero.capacidad_max_ug_ha ? `${potrero.capacidad_max_ug_ha} UG/ha` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Pastura</p>
                <p className="text-muted-foreground truncate">
                  {potrero.tipo_pastura ?? "—"}
                </p>
              </div>
            </div>
            {carga && <CargaBar carga={carga} />}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function PotrerosPage() {
  const [filtro, setFiltro] = useState<EstadoFilter>("todos")
  const [showCreate, setShowCreate] = useState(false)

  const estadoParam = filtro === "todos" ? undefined : filtro
  const { data, isLoading, isError } = usePotreros(estadoParam)
  const { data: cargas } = usePotrerosCarga()

  const items = data?.items ?? []
  const cargaMap = new Map((cargas ?? []).map((c) => [c.potrero_id, c]))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Potreros</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total} {data.total === 1 ? "potrero" : "potreros"}
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo potrero
        </Button>
      </div>

      {showCreate && <CreatePotreroCard onCancel={() => setShowCreate(false)} />}

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filtro === value ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltro(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Error al cargar los potreros.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium">Sin potreros</p>
          <p className="text-sm mt-1">
            {filtro === "todos"
              ? "Creá tu primer potrero con el botón de arriba."
              : "No hay potreros con este estado."}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PotreroCard key={p.id} potrero={p} carga={cargaMap.get(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
