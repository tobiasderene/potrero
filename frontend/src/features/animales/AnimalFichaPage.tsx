import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Pencil, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimalForm } from "./components/AnimalForm"
import { useAnimal } from "./hooks/useAnimales"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  )
}

export function AnimalFichaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const { data: animal, isLoading, error } = useAnimal(id ?? "")
  const { data: potreros } = usePotreros()

  const potreroNombre = animal?.potrero_actual_id
    ? potreros?.items.find(p => p.id === animal.potrero_actual_id)?.nombre ?? animal.potrero_actual_id
    : undefined

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Cargando...</div>
  if (error || !animal) return <div className="p-6 text-muted-foreground text-sm">Animal no encontrado.</div>

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            {animal.caravana_senacsa ?? animal.numero_campo ?? "Sin identificación"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {animal.categoria_actual && (
              <span className="text-sm text-muted-foreground capitalize">
                {animal.categoria_actual.replace(/_/g, " ")}
              </span>
            )}
            <Badge variant={animal.estado === "activo" ? "default" : "secondary"}>
              {animal.estado}
            </Badge>
          </div>
        </div>
        {animal.estado === "activo" && (
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="rounded-lg border p-5 grid grid-cols-2 gap-x-8 gap-y-4">
        <Field label="Caravana SENACSA" value={animal.caravana_senacsa} />
        <Field label="Número de campo" value={animal.numero_campo} />
        <Field label="Sexo" value={animal.sexo === "macho" ? "Macho" : "Hembra"} />
        <Field label="Tipo de origen" value={animal.tipo_origen === "nacido" ? "Nacido en estancia" : "Comprado"} />
        <Field label="Raza" value={animal.raza} />
        <Field
          label="Fecha de nacimiento"
          value={animal.fecha_nacimiento
            ? `${animal.fecha_nacimiento}${animal.fecha_nacimiento_estimada ? " (estimada)" : ""}`
            : undefined}
        />
        <Field label="Establecimiento de origen" value={animal.establecimiento_origen} />
        <Field label="Potrero actual" value={potreroNombre} />
        {animal.fecha_egreso && (
          <Field label="Fecha de egreso" value={animal.fecha_egreso} />
        )}
        {animal.tipo_egreso && (
          <Field label="Tipo de egreso" value={animal.tipo_egreso.replace(/_/g, " ")} />
        )}
      </div>

      <div className="rounded-lg border p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Historial de eventos
        </div>
        <p className="text-sm text-muted-foreground">
          Los movimientos, pesajes y tratamientos aparecerán aquí en sprints siguientes.
        </p>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar animal</DialogTitle></DialogHeader>
          <AnimalForm animal={animal} onSuccess={() => setShowEdit(false)} onCancel={() => setShowEdit(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
