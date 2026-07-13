import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Pencil, RefreshCw, Scale, Pill, AlertTriangle, Weight, Syringe } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { AnimalForm } from "./components/AnimalForm"
import { useAnimal, useCambiarCategoria, getApiError } from "./hooks/useAnimales"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { usePesajesAnimal, useVariacionGdp } from "@/features/pesajes/hooks/usePesajes"
import { useTratamientosAnimal, useVacunacionesAnimal } from "@/features/sanidad/hooks/useSanidad"
import { PesajeIndividualForm } from "@/features/pesajes/components/PesajeIndividualForm"
import { TratamientoForm } from "@/features/sanidad/components/TratamientoForm"
import { DiagnosticoForm } from "@/features/sanidad/components/DiagnosticoForm"

const CATEGORIAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value ?? <span className="text-muted-foreground">—</span>}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          <div className="h-4 w-24 bg-muted/60 animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="h-80 bg-muted/40 animate-pulse rounded-lg" />
        <div className="h-80 bg-muted/40 animate-pulse rounded-lg" />
      </div>
    </div>
  )
}

export function AnimalFichaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [showCategoria, setShowCategoria] = useState(false)
  const [showPesaje, setShowPesaje] = useState(false)
  const [showTratamiento, setShowTratamiento] = useState(false)
  const [showDiagnostico, setShowDiagnostico] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState("")

  const { data: animal, isLoading, error } = useAnimal(id ?? "")
  const { data: potreros } = usePotreros()
  const cambiarCategoria = useCambiarCategoria(id ?? "")
  const { data: pesajes } = usePesajesAnimal(id ?? "")
  const { data: variacion } = useVariacionGdp(id ?? "")
  const { data: tratamientos } = useTratamientosAnimal(id ?? "")
  const { data: vacunaciones } = useVacunacionesAnimal(id ?? "")

  if (isLoading) return <LoadingSkeleton />
  if (error || !animal) return (
    <div className="p-6 text-sm text-muted-foreground">Animal no encontrado.</div>
  )

  const potreroNombre = animal?.potrero_actual_id
    ? potreros?.items.find(p => p.id === animal.potrero_actual_id)?.nombre ?? animal.potrero_actual_id
    : undefined

  const handleCambiarCategoria = async () => {
    if (!nuevaCategoria) return
    await cambiarCategoria.mutateAsync(nuevaCategoria)
    setShowCategoria(false)
    setNuevaCategoria("")
  }

  const categoriasDisponibles = CATEGORIAS.filter(c => c !== animal.categoria_actual)

  const pesoData = (pesajes ?? [])
    .slice()
    .reverse()
    .map(p => ({
      fecha: p.fecha_evento,
      peso: Number(p.peso_kg),
      gdp: p.gdp_g_dia ? Number(p.gdp_g_dia).toFixed(0) : null,
    }))

  const acciones = animal.estado === "activo" ? (
    <div className="flex items-center gap-2">
      {/* Acción principal */}
      <Button size="sm" onClick={() => setShowPesaje(true)}>
        <Scale className="h-3.5 w-3.5" />
        Pesaje
      </Button>
      {/* Acciones secundarias */}
      <Button variant="outline" size="sm" onClick={() => setShowTratamiento(true)}>
        <Pill className="h-3.5 w-3.5" />
        Tratamiento
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowDiagnostico(true)}>
        Diagnóstico
      </Button>
      {/* Acciones terciarias — solo ícono */}
      <Button variant="ghost" size="sm" onClick={() => setShowCategoria(true)} title="Cambiar categoría">
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)} title="Editar">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  ) : undefined

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={animal.caravana_senacsa ?? animal.numero_campo ?? "Sin identificación"}
        description={animal.categoria_actual?.replace(/_/g, " ")}
        onBack={() => navigate(-1)}
        badge={
          <Badge variant={animal.estado === "activo" ? "success" : "inactive"}>
            {animal.estado}
          </Badge>
        }
        action={acciones}
      />

      {/* Alerta GDP bajo */}
      {variacion?.alerta_bajo && variacion.porcentaje_vs_promedio && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            GDP de este animal ({Number(variacion.gdp_animal_g_dia).toFixed(0)} g/día) está al{" "}
            {Number(variacion.porcentaje_vs_promedio).toFixed(0)}% del promedio del lote (
            {Number(variacion.gdp_promedio_lote_g_dia).toFixed(0)} g/día). Por debajo del umbral del 75%.
          </AlertDescription>
        </Alert>
      )}

      {/* Dos columnas */}
      <div className="grid grid-cols-[280px_1fr] gap-6 items-start">

        {/* Izquierda: datos */}
        <div className="rounded-lg border bg-card p-5 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Identificación
          </p>
          <Field label="Caravana SENACSA" value={animal.caravana_senacsa} />
          <Field label="Número de campo" value={animal.numero_campo} />

          <div className="h-px bg-border" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Datos del animal
          </p>
          <Field label="Sexo" value={animal.sexo === "macho" ? "Macho" : "Hembra"} />
          <Field label="Tipo de origen" value={animal.tipo_origen === "nacido" ? "Nacido en estancia" : "Comprado"} />
          <Field label="Raza" value={animal.raza} />
          <Field
            label="Fecha de nacimiento"
            value={animal.fecha_nacimiento
              ? `${animal.fecha_nacimiento}${animal.fecha_nacimiento_estimada ? " (estimada)" : ""}`
              : undefined}
          />

          <div className="h-px bg-border" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ubicación
          </p>
          <Field label="Establecimiento de origen" value={animal.establecimiento_origen} />
          <Field label="Potrero actual" value={potreroNombre} />

          {(animal.fecha_egreso || animal.tipo_egreso) && (
            <>
              <div className="h-px bg-border" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Egreso
              </p>
              {animal.fecha_egreso && <Field label="Fecha de egreso" value={animal.fecha_egreso} />}
              {animal.tipo_egreso && <Field label="Tipo de egreso" value={animal.tipo_egreso.replace(/_/g, " ")} />}
            </>
          )}
        </div>

        {/* Derecha: historial */}
        <div className="rounded-lg border bg-card p-5">
          <Tabs defaultValue="pesajes">
            <TabsList className="h-8 mb-4">
              <TabsTrigger value="pesajes" className="text-xs">
                Pesajes {pesajes?.length ? `(${pesajes.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="tratamientos" className="text-xs">
                Tratamientos {tratamientos?.length ? `(${tratamientos.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="vacunaciones" className="text-xs">
                Vacunas {vacunaciones?.length ? `(${vacunaciones.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pesajes" className="space-y-4">
              {pesoData.length >= 2 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pesoData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={40} />
                      <Tooltip formatter={(v) => [`${v} kg`, "Peso"]} labelFormatter={(l) => `Fecha: ${l}`} />
                      <Line type="monotone" dataKey="peso" stroke="var(--color-primary)" dot={{ r: 3 }} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {variacion && variacion.estado !== "sin_dato_suficiente" && variacion.gdp_animal_g_dia && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">GDP actual:</span>
                  <Badge variant={variacion.alerta_bajo ? "danger" : "success"}>
                    {Number(variacion.gdp_animal_g_dia).toFixed(0)} g/día
                  </Badge>
                  {variacion.porcentaje_vs_promedio && (
                    <span className="text-xs text-muted-foreground">
                      {Number(variacion.porcentaje_vs_promedio).toFixed(0)}% vs. promedio del lote
                    </span>
                  )}
                </div>
              )}

              {!pesajes?.length ? (
                <EmptyState
                  icon={<Weight className="h-5 w-5" />}
                  title="Sin pesajes"
                  description="Registrá el primer pesaje con el botón de arriba."
                  className="py-10"
                />
              ) : (
                <div className="divide-y">
                  {pesajes.map(p => (
                    <div key={p.evento_id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{Number(p.peso_kg).toFixed(1)} kg</p>
                        <p className="text-xs text-muted-foreground">{p.fecha_evento}</p>
                      </div>
                      {p.gdp_g_dia && (
                        <Badge variant="outline" className="text-xs">
                          GDP {Number(p.gdp_g_dia).toFixed(0)} g/d · {p.dias_intervalo} días
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tratamientos">
              {!tratamientos?.length ? (
                <EmptyState
                  icon={<Pill className="h-5 w-5" />}
                  title="Sin tratamientos"
                  description="Los tratamientos y sus períodos de carencia aparecerán acá."
                  className="py-10"
                />
              ) : (
                <div className="divide-y">
                  {tratamientos.map(t => (
                    <div key={t.evento_id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{t.medicamento}</p>
                        {t.dias_carencia > 0 && (
                          <Badge variant="danger" className="text-xs">
                            Carencia hasta {t.fecha_fin_carencia}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.fecha_evento} · {t.dias_carencia} días carencia
                        {t.veterinario ? ` · Dr. ${t.veterinario}` : ""}
                      </p>
                      {t.diagnostico && <p className="text-xs text-muted-foreground">{t.diagnostico}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="vacunaciones">
              {!vacunaciones?.length ? (
                <EmptyState
                  icon={<Syringe className="h-5 w-5" />}
                  title="Sin vacunaciones"
                  description="Las vacunas aplicadas a este animal aparecerán acá."
                  className="py-10"
                />
              ) : (
                <div className="divide-y">
                  {vacunaciones.map(v => (
                    <div key={v.evento_id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.biologico}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.fecha_evento}{v.laboratorio ? ` · ${v.laboratorio}` : ""}
                        </p>
                      </div>
                      {v.es_antiaftosa && <Badge variant="success" className="text-xs">Antiaftosa</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar animal</DialogTitle></DialogHeader>
          <AnimalForm animal={animal} onSuccess={() => setShowEdit(false)} onCancel={() => setShowEdit(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoria} onOpenChange={open => { setShowCategoria(open); if (!open) setNuevaCategoria("") }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cambiar categoría</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Categoría actual:{" "}
              <span className="font-medium capitalize text-foreground">
                {animal.categoria_actual?.replace(/_/g, " ") ?? "sin categoría"}
              </span>
            </p>
            <Select value={nuevaCategoria} onValueChange={(v: string) => setNuevaCategoria(v)}>
              <SelectTrigger><SelectValue placeholder="Nueva categoría" /></SelectTrigger>
              <SelectContent>
                {categoriasDisponibles.map(c => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cambiarCategoria.error && (
              <Alert variant="destructive">
                <AlertDescription>{getApiError(cambiarCategoria.error)}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCategoria(false)}>Cancelar</Button>
              <Button onClick={handleCambiarCategoria} disabled={!nuevaCategoria || cambiarCategoria.isPending}>
                {cambiarCategoria.isPending ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPesaje} onOpenChange={setShowPesaje}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar pesaje</DialogTitle></DialogHeader>
          <PesajeIndividualForm
            animalId={id ?? ""}
            onSuccess={() => setShowPesaje(false)}
            onCancel={() => setShowPesaje(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTratamiento} onOpenChange={setShowTratamiento}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar tratamiento</DialogTitle></DialogHeader>
          <TratamientoForm
            animalId={id ?? ""}
            onSuccess={() => setShowTratamiento(false)}
            onCancel={() => setShowTratamiento(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showDiagnostico} onOpenChange={setShowDiagnostico}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar diagnóstico</DialogTitle></DialogHeader>
          <DiagnosticoForm
            animalId={id ?? ""}
            onSuccess={() => setShowDiagnostico(false)}
            onCancel={() => setShowDiagnostico(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
