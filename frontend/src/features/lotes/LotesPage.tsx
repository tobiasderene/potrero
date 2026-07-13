import { useState } from "react"
import { AlertCircle, Clock, Layers, Pencil, Plus, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormError } from "@/components/FormError"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import type { LoteRead } from "@/types/api"
import { getApiError, useCreateLote, useLotes, useUpdateLote } from "./hooks/useLotes"

const PROPOSITOS = [
  { value: "invernada", label: "Invernada" },
  { value: "cria",      label: "Cría" },
  { value: "recria",    label: "Recría" },
  { value: "reproduccion", label: "Reproducción" },
]

const ESTADO_VARIANT: Record<string, "success" | "inactive"> = {
  activo:  "success",
  cerrado: "inactive",
}

interface LoteForm {
  nombre: string; proposito: string; potrero_principal_id: string
  fecha_formacion: string; peso_promedio_ingreso: string
  peso_objetivo_salida: string; plazo_estimado_dias: string
}

const EMPTY_FORM: LoteForm = {
  nombre: "", proposito: "invernada", potrero_principal_id: "",
  fecha_formacion: new Date().toISOString().slice(0, 10),
  peso_promedio_ingreso: "", peso_objetivo_salida: "", plazo_estimado_dias: "",
}

function toPayload(form: LoteForm) {
  return {
    nombre: form.nombre.trim(), proposito: form.proposito,
    potrero_principal_id: form.potrero_principal_id || null,
    fecha_formacion: form.fecha_formacion,
    peso_promedio_ingreso: form.peso_promedio_ingreso ? parseFloat(form.peso_promedio_ingreso) : null,
    peso_objetivo_salida: form.peso_objetivo_salida ? parseFloat(form.peso_objetivo_salida) : null,
    plazo_estimado_dias: form.plazo_estimado_dias ? parseInt(form.plazo_estimado_dias) : null,
  }
}

function LoteFormFields({ form, onChange, potreroOptions }: {
  form: LoteForm; onChange: (f: LoteForm) => void
  potreroOptions: { id: string; nombre: string }[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nombre *</Label>
        <Input placeholder="Lote 2025 Invernada" value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Propósito *</Label>
        <Select value={form.proposito} onValueChange={(v) => onChange({ ...form, proposito: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROPOSITOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Fecha formación *</Label>
        <Input type="date" max={new Date().toISOString().slice(0, 10)} value={form.fecha_formacion}
          onChange={(e) => onChange({ ...form, fecha_formacion: e.target.value })} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Potrero principal</Label>
        <Select value={form.potrero_principal_id || "__none__"}
          onValueChange={(v) => onChange({ ...form, potrero_principal_id: v === "__none__" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Sin potrero asignado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin potrero</SelectItem>
            {potreroOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Peso prom. ingreso (kg)</Label>
        <Input type="number" step="0.1" min="0" placeholder="180"
          value={form.peso_promedio_ingreso}
          onChange={(e) => onChange({ ...form, peso_promedio_ingreso: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Peso objetivo salida (kg)</Label>
        <Input type="number" step="0.1" min="0" placeholder="420"
          value={form.peso_objetivo_salida}
          onChange={(e) => onChange({ ...form, peso_objetivo_salida: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Plazo estimado (días)</Label>
        <Input type="number" step="1" min="1" placeholder="180"
          value={form.plazo_estimado_dias}
          onChange={(e) => onChange({ ...form, plazo_estimado_dias: e.target.value })} />
      </div>
    </div>
  )
}

function LoteFormDialog({ title, defaultForm, onSave, onClose, potreroOptions, isPending, error }: {
  title: string; defaultForm: LoteForm
  onSave: (f: LoteForm) => void; onClose: () => void
  potreroOptions: { id: string; nombre: string }[]
  isPending: boolean; error: string | null
}) {
  const [form, setForm] = useState<LoteForm>(defaultForm)
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <FormError message={error} />
      <LoteFormFields form={form} onChange={setForm} potreroOptions={potreroOptions} />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : title}</Button>
      </div>
    </form>
  )
}

function LoteCard({ lote, potreroOptions }: { lote: LoteRead; potreroOptions: { id: string; nombre: string }[] }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useUpdateLote()
  const propLabel = PROPOSITOS.find((p) => p.value === lote.proposito)?.label ?? lote.proposito

  async function handleSave(form: LoteForm) {
    setError(null)
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    try { await mutateAsync({ id: lote.id, ...toPayload(form) }); setEditing(false) }
    catch (err) { setError(getApiError(err)) }
  }

  return (
    <>
      <Card className={lote.estado === "cerrado" ? "opacity-60" : ""}>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold leading-tight">{lote.nombre}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant={ESTADO_VARIANT[lote.estado] ?? "outline"}>
                  {lote.estado === "activo" ? "Activo" : "Cerrado"}
                </Badge>
                <Badge variant="outline">{propLabel}</Badge>
              </div>
            </div>
            {lote.estado === "activo" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{lote.total_animales} animales</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{lote.fecha_formacion}</span>
            </div>
            {lote.peso_promedio_ingreso && (
              <div>
                <p className="text-xs font-medium">Ingreso</p>
                <p className="text-muted-foreground">{lote.peso_promedio_ingreso} kg</p>
              </div>
            )}
            {lote.peso_objetivo_salida && (
              <div>
                <p className="text-xs font-medium">Objetivo</p>
                <p className="text-muted-foreground">{lote.peso_objetivo_salida} kg</p>
              </div>
            )}
            {lote.plazo_estimado_dias && (
              <div>
                <p className="text-xs font-medium">Plazo</p>
                <p className="text-muted-foreground">{lote.plazo_estimado_dias} días</p>
              </div>
            )}
            {lote.fecha_cierre && (
              <div>
                <p className="text-xs font-medium">Cierre</p>
                <p className="text-muted-foreground">{lote.fecha_cierre}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={(o) => !o && setEditing(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar lote</DialogTitle></DialogHeader>
          <LoteFormDialog
            title="Guardar cambios"
            defaultForm={{
              nombre: lote.nombre, proposito: lote.proposito,
              potrero_principal_id: lote.potrero_principal_id ?? "",
              fecha_formacion: lote.fecha_formacion,
              peso_promedio_ingreso: lote.peso_promedio_ingreso ?? "",
              peso_objetivo_salida: lote.peso_objetivo_salida ?? "",
              plazo_estimado_dias: lote.plazo_estimado_dias?.toString() ?? "",
            }}
            onSave={handleSave}
            onClose={() => setEditing(false)}
            potreroOptions={potreroOptions}
            isPending={isPending}
            error={error}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="h-4 w-36 bg-muted animate-pulse rounded" />
      <div className="flex gap-2">
        <div className="h-5 w-14 bg-muted/70 animate-pulse rounded" />
        <div className="h-5 w-16 bg-muted/70 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="h-3 w-24 bg-muted/50 animate-pulse rounded" />
        <div className="h-3 w-20 bg-muted/50 animate-pulse rounded" />
      </div>
    </div>
  )
}

export function LotesPage() {
  const [estadoFiltro, setEstadoFiltro] = useState<"activo" | "cerrado" | undefined>("activo")
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading, isError } = useLotes(estadoFiltro)
  const { data: potrerosData } = usePotreros()
  const { mutateAsync: crear, isPending: creando } = useCreateLote()
  const potreroOptions = potrerosData?.items ?? []
  const items = data?.items ?? []

  async function handleCreate(form: LoteForm) {
    setCreateError(null)
    if (!form.nombre.trim()) { setCreateError("El nombre es obligatorio"); return }
    if (!form.fecha_formacion) { setCreateError("La fecha de formación es obligatoria"); return }
    try { await crear(toPayload(form)); setShowCreate(false) }
    catch (err) { setCreateError(getApiError(err)) }
  }

  const FILTROS = [
    { value: "activo" as const, label: "Activos" },
    { value: "cerrado" as const, label: "Cerrados" },
    { value: undefined, label: "Todos" },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Lotes"
        description={data ? `${data.total} ${data.total === 1 ? "lote" : "lotes"}` : undefined}
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nuevo lote
          </Button>
        }
      />

      <div className="flex gap-2">
        {FILTROS.map(({ value, label }) => (
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

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al cargar los lotes.</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title="Sin lotes"
          description={
            estadoFiltro
              ? `No hay lotes ${estadoFiltro === "activo" ? "activos" : "cerrados"}.`
              : "Creá tu primer lote para organizar tus animales."
          }
          action={
            estadoFiltro !== "cerrado" ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                Nuevo lote
              </Button>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((lote) => (
            <LoteCard key={lote.id} lote={lote} potreroOptions={potreroOptions} />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo lote</DialogTitle></DialogHeader>
          <LoteFormDialog
            title="Crear lote"
            defaultForm={EMPTY_FORM}
            onSave={handleCreate}
            onClose={() => setShowCreate(false)}
            potreroOptions={potreroOptions}
            isPending={creando}
            error={createError}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
