import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, getApiError } from "@/lib/api/client"
import type { CategoriaRead } from "@/types/api"

const NOMBRE_DISPLAY: Record<string, { label: string; ugDefault: string }> = {
  ternero:      { label: "Ternero",       ugDefault: "0.30" },
  ternera:      { label: "Ternera",       ugDefault: "0.30" },
  novillo:      { label: "Novillo",       ugDefault: "0.70" },
  vaquillona:   { label: "Vaquillona",    ugDefault: "0.70" },
  vaca:         { label: "Vaca",          ugDefault: "1.00" },
  vaca_con_cria:{ label: "Vaca con cría", ugDefault: "1.20" },
  toro:         { label: "Toro",          ugDefault: "1.20" },
  buey:         { label: "Buey",          ugDefault: "1.00" },
}

export function CategoriasPage() {
  const qc = useQueryClient()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: categorias, isLoading, isError } = useQuery<CategoriaRead[]>({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data } = await api.get<CategoriaRead[]>("/api/v1/categorias")
      return data
    },
  })

  useEffect(() => {
    if (categorias) setEdits({})
  }, [categorias])

  const hasPendingChanges = categorias?.some(
    (cat) => edits[cat.id] !== undefined && edits[cat.id] !== String(cat.coeficiente_ug)
  ) ?? false

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!categorias) return
      const changed = categorias.filter(
        (cat) => edits[cat.id] !== undefined && edits[cat.id] !== String(cat.coeficiente_ug)
      )
      for (const cat of changed) {
        await api.patch(`/api/v1/categorias/${cat.id}`, {
          coeficiente_ug: parseFloat(edits[cat.id]),
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => setError(getApiError(err)),
  })

  function handleChange(id: string, value: string) {
    setError(null)
    setSaved(false)
    setEdits((prev) => ({ ...prev, [id]: value }))
  }

  function handleReset() {
    setEdits({})
    setError(null)
    setSaved(false)
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Categorías UG</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Coeficientes de Unidad Ganadera por categoría. Los valores estándar de Paraguay
          vienen precargados.
        </p>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Error al cargar las categorías.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert>
          <AlertDescription>Coeficientes actualizados correctamente.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="rounded-lg border divide-y">
          <div className="grid grid-cols-3 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className="col-span-2">Categoría</span>
            <span>Coef. UG</span>
          </div>
          {categorias?.map((cat) => {
            const meta = NOMBRE_DISPLAY[cat.nombre]
            const value = edits[cat.id] ?? cat.coeficiente_ug
            const changed = edits[cat.id] !== undefined && edits[cat.id] !== String(cat.coeficiente_ug)
            return (
              <div key={cat.id} className="grid grid-cols-3 items-center gap-3 px-4 py-3">
                <div className="col-span-2">
                  <p className="text-sm font-medium">{meta?.label ?? cat.nombre}</p>
                  {meta && (
                    <p className="text-xs text-muted-foreground">
                      Estándar: {meta.ugDefault} UG
                    </p>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={value}
                  onChange={(e) => handleChange(cat.id, e.target.value)}
                  className={`h-8 w-24 ${changed ? "border-primary ring-1 ring-primary/30" : ""}`}
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={() => mutate()}
          disabled={!hasPendingChanges || isPending}
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        {hasPendingChanges && (
          <Button variant="outline" onClick={handleReset}>
            Descartar
          </Button>
        )}
      </div>
    </div>
  )
}
