import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState } from "react"
import type { EstablecimientoRead } from "@/types/api"

const MESES = [
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" }, { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" }, { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
]

const schema = z.object({
  nombre: z.string().min(1, "Requerido").max(200),
  nombre_propietario: z.string().min(1, "Requerido").max(200),
  fecha_inicio_sistema: z.string().min(1, "Requerido"),
  departamento: z.string().optional(),
  numero_senacsa: z.string().optional(),
  ejercicio_inicio_mes: z.coerce.number().int().min(1).max(12),
})

type FormData = z.infer<typeof schema>

interface Props {
  onNext: (establecimiento: EstablecimientoRead) => void
}

export function StepEstablecimiento({ onNext }: Props) {
  const [apiError, setApiError] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_inicio_sistema: today,
      ejercicio_inicio_mes: 7,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        nombre: data.nombre,
        nombre_propietario: data.nombre_propietario,
        fecha_inicio_sistema: data.fecha_inicio_sistema,
        departamento: data.departamento || null,
        numero_senacsa: data.numero_senacsa || null,
        ejercicio_inicio_mes: data.ejercicio_inicio_mes,
      }
      const { data: est } = await api.post<EstablecimientoRead>(
        "/api/v1/establecimientos",
        payload
      )
      return est
    },
    onSuccess: (est) => onNext(est),
    onError: (err) => setApiError(getApiError(err)),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nombre">Nombre del establecimiento *</Label>
          <Input id="nombre" placeholder="Estancia San Pedro" {...register("nombre")} />
          {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nombre_propietario">Nombre del propietario *</Label>
          <Input id="nombre_propietario" placeholder="Juan García" {...register("nombre_propietario")} />
          {errors.nombre_propietario && (
            <p className="text-xs text-destructive">{errors.nombre_propietario.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fecha_inicio">Inicio del sistema *</Label>
          <Input id="fecha_inicio" type="date" {...register("fecha_inicio_sistema")} />
          {errors.fecha_inicio_sistema && (
            <p className="text-xs text-destructive">{errors.fecha_inicio_sistema.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ejercicio_mes">Inicio ejercicio ganadero</Label>
          <select
            id="ejercicio_mes"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register("ejercicio_inicio_mes")}
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="departamento">Departamento</Label>
          <Input id="departamento" placeholder="Concepción" {...register("departamento")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="numero_senacsa">N° SENACSA</Label>
          <Input id="numero_senacsa" placeholder="00-00000" {...register("numero_senacsa")} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
        {mutation.isPending ? "Creando..." : "Continuar →"}
      </Button>
    </form>
  )
}
