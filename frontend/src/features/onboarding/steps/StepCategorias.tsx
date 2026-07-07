import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import type { CategoriaRead } from "@/types/api"

const NOMBRE_DISPLAY: Record<string, string> = {
  ternero: "Ternero",
  ternera: "Ternera",
  novillo: "Novillo",
  vaquillona: "Vaquillona",
  toro: "Toro",
  vaca: "Vaca",
  vaca_con_cria: "Vaca con cría",
  buey: "Buey",
}

interface Props {
  onFinish: () => void
  onBack: () => void
}

export function StepCategorias({ onFinish, onBack }: Props) {
  const [apiError, setApiError] = useState<string | null>(null)
  // Solo guarda los valores que el usuario editó; el resto usa cat.coeficiente_ug
  const [edits, setEdits] = useState<Record<string, string>>({})
  const qc = useQueryClient()

  const { data: categorias, isLoading } = useQuery<CategoriaRead[]>({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data } = await api.get<CategoriaRead[]>("/api/v1/categorias")
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!categorias) return
      for (const cat of categorias) {
        const edited = edits[cat.id]
        if (edited !== undefined && edited !== cat.coeficiente_ug) {
          await api.patch(`/api/v1/categorias/${cat.id}`, {
            coeficiente_ug: parseFloat(edited),
          })
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
      onFinish()
    },
    onError: (err) => setApiError(getApiError(err)),
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando categorías...</p>
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Los coeficientes de Unidad Ganadera (UG) vienen precargados con los valores estándar
        de Paraguay. Podés ajustarlos si tu establecimiento usa valores diferentes.
      </p>

      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-2 px-1 text-xs font-medium text-muted-foreground">
          <span>Categoría</span>
          <span>Coeficiente UG</span>
        </div>
        {categorias?.map((cat) => (
          <div key={cat.id} className="grid grid-cols-2 items-center gap-3 rounded-md border px-3 py-2">
            <span className="text-sm">{NOMBRE_DISPLAY[cat.nombre] ?? cat.nombre}</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="10"
              value={edits[cat.id] ?? cat.coeficiente_ug}
              onChange={(e) => setEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))}
              className="h-8 w-24"
            />
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Atrás
        </Button>
        <Button
          className="flex-1"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Guardando..." : "Finalizar configuración"}
        </Button>
      </div>
    </div>
  )
}
