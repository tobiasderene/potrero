import { useState, useEffect } from "react"
import { CheckCircle2 } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
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

function TableSkeleton() {
  return (
    <div className="rounded-lg border divide-y">
      <div className="grid grid-cols-3 px-4 py-2">
        <div className="col-span-2 h-3 w-20 bg-muted animate-pulse rounded" />
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-3 items-center gap-3 px-4 py-3">
          <div className="col-span-2 space-y-1.5">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-32 bg-muted/60 animate-pulse rounded" />
          </div>
          <div className="h-8 w-24 bg-muted/40 animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
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
      <PageHeader
        title="Categorías UG"
        description="Coeficientes de Unidad Ganadera por categoría. Los valores estándar de Paraguay vienen precargados."
      />

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
        <div className="flex items-center gap-2.5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Coeficientes actualizados correctamente.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="rounded-lg border divide-y">
          <div className="grid grid-cols-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">Estándar: {meta.ugDefault} UG</p>
                  )}
                </div>
                <Input
                  type="number" step="0.01" min="0.01" max="10" value={value}
                  onChange={(e) => handleChange(cat.id, e.target.value)}
                  className={`h-8 w-24 ${changed ? "border-primary ring-1 ring-primary/30" : ""}`}
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => mutate()} disabled={!hasPendingChanges || isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        {hasPendingChanges && (
          <Button variant="outline" onClick={handleReset}>Descartar</Button>
        )}
      </div>
    </div>
  )
}
