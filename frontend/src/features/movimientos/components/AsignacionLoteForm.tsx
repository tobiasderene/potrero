import { useState } from "react"
import { FormError } from "@/components/FormError"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimalMultiSearchSelect } from "@/components/AnimalMultiSearchSelect"
import { useAsignarAnimalesLote } from "@/features/lotes/hooks/useLotes"
import { getApiError } from "../hooks/useMovimientos"
import type { AnimalRead, LoteRead } from "@/types/api"

interface Props {
  lotes: LoteRead[]
  onSuccess: (result: { evento_id: string; asignados: number }) => void
  onCancel: () => void
}

export function AsignacionLoteForm({ lotes, onSuccess, onCancel }: Props) {
  const [loteId, setLoteId] = useState("")
  const [seleccionados, setSeleccionados] = useState<Map<string, AnimalRead>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useAsignarAnimalesLote()

  function toggleAnimal(a: AnimalRead) {
    setSeleccionados((prev) => {
      const next = new Map(prev)
      if (next.has(a.id)) next.delete(a.id)
      else next.set(a.id, a)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!loteId) { setError("Debe seleccionar un lote destino"); return }
    if (seleccionados.size === 0) { setError("Debe seleccionar al menos un animal"); return }

    try {
      const result = await mutateAsync({ loteId, animalIds: Array.from(seleccionados.keys()) })
      onSuccess({ evento_id: loteId, asignados: result.asignados })
    } catch (err) {
      setError(getApiError(err))
    }
  }

  const lotesActivos = lotes.filter((l) => l.estado === "activo")

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />

      <div className="space-y-1.5">
        <Label>Lote destino *</Label>
        <Select value={loteId || "__none__"} onValueChange={(v) => setLoteId(v === "__none__" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar lote..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Seleccionar lote</SelectItem>
            {lotesActivos.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.nombre} ({l.proposito})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {lotesActivos.length === 0 && (
          <p className="text-xs text-muted-foreground">No hay lotes activos. Creá uno primero en la sección Lotes.</p>
        )}
      </div>

      <AnimalMultiSearchSelect
        label="Animales"
        selected={seleccionados}
        onToggle={toggleAnimal}
        onClear={() => setSeleccionados(new Map())}
        renderBadge={(a) =>
          a.lote_actual_id ? (
            <span className="text-xs text-muted-foreground shrink-0">
              ({lotes.find((l) => l.id === a.lote_actual_id)?.nombre ?? "otro lote"})
            </span>
          ) : null
        }
      />

      <p className="text-xs text-muted-foreground">
        Si el animal ya está en otro lote, se mueve automáticamente (RN-03).
      </p>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || seleccionados.size === 0 || !loteId}>
          {isPending ? "Asignando..." : `Asignar ${seleccionados.size} animal${seleccionados.size !== 1 ? "es" : ""}`}
        </Button>
      </div>
    </form>
  )
}
