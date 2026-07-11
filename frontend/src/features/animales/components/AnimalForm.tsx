import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { useCrearAnimal, useActualizarAnimal, getApiError, type AnimalCreatePayload, type AnimalUpdatePayload } from "../hooks/useAnimales"
import type { AnimalRead } from "@/types/api"

const CATEGORIAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]

interface Props {
  animal?: AnimalRead
  onSuccess: () => void
  onCancel: () => void
}

export function AnimalForm({ animal, onSuccess, onCancel }: Props) {
  const isEdit = !!animal
  const { data: potreros } = usePotreros("activo")
  const crear = useCrearAnimal()
  const actualizar = useActualizarAnimal(animal?.id ?? "")

  const { register, handleSubmit, setValue } = useForm<AnimalCreatePayload>({
    defaultValues: isEdit ? {
      caravana_senacsa: animal.caravana_senacsa ?? "",
      numero_campo: animal.numero_campo ?? "",
      raza: animal.raza ?? "",
      fecha_nacimiento: animal.fecha_nacimiento ?? "",
      establecimiento_origen: animal.establecimiento_origen ?? "",
    } : {
      sexo: "macho",
      tipo_origen: "comprado",
      categoria: "novillo",
    },
  })

  const onSubmit = async (values: AnimalCreatePayload) => {
    const clean = {
      ...values,
      caravana_senacsa: values.caravana_senacsa || null,
      numero_campo: values.numero_campo || null,
      raza: values.raza || null,
      fecha_nacimiento: values.fecha_nacimiento || null,
      establecimiento_origen: values.establecimiento_origen || null,
      potrero_id: values.potrero_id || null,
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync(clean as AnimalUpdatePayload)
      } else {
        await crear.mutateAsync(clean)
      }
      onSuccess()
    } catch (e) {
      // error shown below
    }
  }

  const error = isEdit ? actualizar.error : crear.error
  const isPending = isEdit ? actualizar.isPending : crear.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Caravana SENACSA</Label>
          <Input {...register("caravana_senacsa")} placeholder="AR001" />
        </div>
        <div className="space-y-1.5">
          <Label>Número de campo</Label>
          <Input {...register("numero_campo")} placeholder="101" />
        </div>
      </div>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Sexo *</Label>
            <Select defaultValue="macho" onValueChange={(v: string) => setValue("sexo", v as "macho" | "hembra")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="macho">Macho</SelectItem>
                <SelectItem value="hembra">Hembra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de origen *</Label>
            <Select defaultValue="comprado" onValueChange={(v: string) => setValue("tipo_origen", v as "nacido" | "comprado")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comprado">Comprado</SelectItem>
                <SelectItem value="nacido">Nacido en estancia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!isEdit && (
        <div className="space-y-1.5">
          <Label>Categoría *</Label>
          <Select defaultValue="novillo" onValueChange={(v: string) => setValue("categoria", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(c => (
                <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Raza</Label>
          <Input {...register("raza")} placeholder="Hereford" />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de nacimiento</Label>
          <Input {...register("fecha_nacimiento")} type="date" />
        </div>
      </div>

      {!isEdit && (
        <div className="space-y-1.5">
          <Label>Potrero</Label>
          <Select onValueChange={(v: string) => setValue("potrero_id", v)}>
            <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent>
              {potreros?.items.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Establecimiento de origen</Label>
        <Input {...register("establecimiento_origen")} placeholder="Estancia Las Palmas" />
      </div>

      {error && <Alert variant="destructive">{getApiError(error)}</Alert>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear animal"}
        </Button>
      </div>
    </form>
  )
}
