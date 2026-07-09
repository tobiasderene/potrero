import { useState } from "react"
import { AlertCircle, Clock, Pencil, Plus, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import type { LoteRead } from "@/types/api"
import { getApiError, useCreateLote, useLotes, useUpdateLote } from "./hooks/useLotes"

const PROPOSITOS = [
  { value: "invernada", label: "Invernada" },
  { value: "cria", label: "Cría" },
  { value: "recria", label: "Recría" },
  { value: "reproduccion", label: "Reproducción" },
]

const ESTADO_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  activo: "default",
  cerrado: "outline",
}

interface LoteForm {
  nombre: string
  proposito: string
  potrero_principal_id: string
  fecha_formacion: string
  peso_promedio_ingreso: string
  peso_objetivo_salida: string
  plazo_estimado_dias: string
}

const EMPTY_FORM: LoteForm = {
  nombre: "",
  proposito: "invernada",
  potrero_principal_id: "",
  fecha_formacion: new Date().toISOString().slice(0, 10),
  peso_promedio_ingreso: "",
  peso_objetivo_salida: "",
  plazo_estimado_dias: "",
}

function toPayload(form: LoteForm) {
  return {
    nombre: form.nombre.trim(),
    proposito: form.proposito,
    potrero_principal_id: form.potrero_principal_id || null,
    fecha_formacion: form.fecha_formacion,
    peso_promedio_ingreso: form.peso_promedio_ingreso ? parseFloat(form.peso_promedio_ingreso) : null,
    peso_objetivo_salida: form.peso_objetivo_salida ? parseFloat(form.peso_objetivo_salida) : null,
    plazo_estimado_dias: form.plazo_estimado_dias ? parseInt(form.plazo_estimado_dias) : null,
  }
}

function LoteFormFields({
  form,
  onChange,
  potreroOptions,
}: {
  form: LoteForm
  onChange: (f: LoteForm) => void
  potreroOptions: { id: string; nombre: string }[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nombre *</Label>
        <Input
          placeholder="Lote 2025 Invernada"
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Propósito *</Label>
        <Select value={form.proposito} onValueChange={(v) => onChange({ ...form, proposito: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROPOSITOS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Fecha formación *</Label>
        <Input
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={form.fecha_formacion}
          onChange={(e) => onChange({ ...form, fecha_formacion: e.target.value })}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Potrero principal</Label>
        <Select
          value={form.potrero_principal_id || "__none__"}
          onValueChange={(v) => onChange({ ...form, potrero_principal_id: v === "__none__" ? "" : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin potrero asignado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin potrero</SelectItem>
            {potreroOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Peso promedio ingreso (kg)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          placeholder="180"
          value={form.peso_promedio_ingreso}
          onChange={(e) => onChange({ ...form, peso_promedio_ingreso: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Peso objetivo salida (kg)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          placeholder="420"
          value={form.peso_objetivo_salida}
          onChange={(e) => onChange({ ...form, peso_objetivo_salida: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Plazo estimado (días)</Label>
        <Input
          type="number"
          step="1"
          min="1"
          placeholder="180"
          value={form.plazo_estimado_dias}
          onChange={(e) => onChange({ ...form, plazo_estimado_dias: e.target.value })}
        />
      </div>
    </div>
  )
}

function CreateLoteDialog({
  open,
  onClose,
  potreroOptions,
}: {
  open: boolean
  onClose: () => void
  potreroOptions: { id: string; nombre: string }[]
}) {
  const [form, setForm] = useState<LoteForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useCreateLote()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    if (!form.fecha_formacion) { setError("La fecha de formación es obligatoria"); return }
    try {
      await mutateAsync(toPayload(form))
      onClose()
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo lote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <LoteFormFields form={form} onChange={setForm} potreroOptions={potreroOptions} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear lote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditLoteDialog({
  lote,
  open,
  onClose,
  potreroOptions,
}: {
  lote: LoteRead
  open: boolean
  onClose: () => void
  potreroOptions: { id: string; nombre: string }[]
}) {
  const [form, setForm] = useState<LoteForm>({
    nombre: lote.nombre,
    proposito: lote.proposito,
    potrero_principal_id: lote.potrero_principal_id ?? "",
    fecha_formacion: lote.fecha_formacion,
    peso_promedio_ingreso: lote.peso_promedio_ingreso ?? "",
    peso_objetivo_salida: lote.peso_objetivo_salida ?? "",
    plazo_estimado_dias: lote.plazo_estimado_dias?.toString() ?? "",
  })
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useUpdateLote()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    try {
      await mutateAsync({ id: lote.id, ...toPayload(form) })
      onClose()
    } catch (err) {
      setError(getApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar lote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <LoteFormFields form={form} onChange={setForm} potreroOptions={potreroOptions} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LoteCard({ lote, potreroOptions }: { lote: LoteRead; potreroOptions: { id: string; nombre: string }[] }) {
  const [editing, setEditing] = useState(false)
  const propLabel = PROPOSITOS.find((p) => p.value === lote.proposito)?.label ?? lote.proposito

  return (
    <>
      <Card className={lote.estado === "cerrado" ? "opacity-60" : ""}>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold leading-tight">{lote.nombre}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant={ESTADO_BADGE[lote.estado]} className="text-xs">
                  {lote.estado === "activo" ? "Activo" : "Cerrado"}
                </Badge>
                <Badge variant="secondary" className="text-xs">{propLabel}</Badge>
              </div>
            </div>
            {lote.estado === "activo" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{lote.total_animales} animales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{lote.fecha_formacion}</span>
            </div>
            {lote.peso_promedio_ingreso && (
              <div>
                <span className="text-xs font-medium">Ingreso</span>
                <p className="text-muted-foreground">{lote.peso_promedio_ingreso} kg</p>
              </div>
            )}
            {lote.peso_objetivo_salida && (
              <div>
                <span className="text-xs font-medium">Objetivo</span>
                <p className="text-muted-foreground">{lote.peso_objetivo_salida} kg</p>
              </div>
            )}
            {lote.plazo_estimado_dias && (
              <div>
                <span className="text-xs font-medium">Plazo</span>
                <p className="text-muted-foreground">{lote.plazo_estimado_dias} días</p>
              </div>
            )}
            {lote.fecha_cierre && (
              <div>
                <span className="text-xs font-medium">Cierre</span>
                <p className="text-muted-foreground">{lote.fecha_cierre}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <EditLoteDialog
          lote={lote}
          open={editing}
          onClose={() => setEditing(false)}
          potreroOptions={potreroOptions}
        />
      )}
    </>
  )
}

export function LotesPage() {
  const [estadoFiltro, setEstadoFiltro] = useState<"activo" | "cerrado" | undefined>("activo")
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, isError } = useLotes(estadoFiltro)
  const { data: potrerosData } = usePotreros()
  const potreroOptions = potrerosData?.items ?? []

  const items = data?.items ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lotes</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total} {data.total === 1 ? "lote" : "lotes"}
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo lote
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { value: "activo" as const, label: "Activos" },
          { value: "cerrado" as const, label: "Cerrados" },
          { value: undefined, label: "Todos" },
        ].map(({ value, label }) => (
          <Button
            key={label}
            variant={estadoFiltro === value ? "default" : "outline"}
            size="sm"
            onClick={() => setEstadoFiltro(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al cargar los lotes.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium">Sin lotes</p>
          <p className="text-sm mt-1">Creá tu primer lote con el botón de arriba.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((lote) => (
            <LoteCard key={lote.id} lote={lote} potreroOptions={potreroOptions} />
          ))}
        </div>
      )}

      <CreateLoteDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        potreroOptions={potreroOptions}
      />
    </div>
  )
}
