import { useState } from "react"
import { api, getApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { X, Plus } from "lucide-react"
import type { PotreroRead } from "@/types/api"

interface PotreroForm {
  nombre: string
  superficie_ha: string
  tipo_pastura: string
  capacidad_max_ug_ha: string
}

interface PotreroEntry extends PotreroForm {
  _key: number
}

interface Props {
  onNext: (potreros: PotreroRead[]) => void
  onBack: () => void
}

let _seq = 0

export function StepPotreros({ onNext, onBack }: Props) {
  const [potreros, setPotreros] = useState<PotreroEntry[]>([{ _key: ++_seq, nombre: "", superficie_ha: "", tipo_pastura: "", capacidad_max_ug_ha: "" }])
  const [apiError, setApiError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addPotrero() {
    setPotreros((prev) => [...prev, { _key: ++_seq, nombre: "", superficie_ha: "", tipo_pastura: "", capacidad_max_ug_ha: "" }])
  }

  function removePotrero(key: number) {
    setPotreros((prev) => prev.filter((p) => p._key !== key))
  }

  function updatePotrero(key: number, field: keyof PotreroForm, value: string) {
    setPotreros((prev) => prev.map((p) => p._key === key ? { ...p, [field]: value } : p))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)

    if (potreros.some((p) => !p.nombre.trim())) {
      setApiError("Todos los potreros deben tener un nombre")
      return
    }

    setSaving(true)
    try {
      const created: PotreroRead[] = []
      for (const p of potreros) {
        const { data } = await api.post<PotreroRead>("/api/v1/potreros", {
          nombre: p.nombre.trim(),
          superficie_ha: p.superficie_ha ? parseFloat(p.superficie_ha) : null,
          tipo_pastura: p.tipo_pastura?.trim() || null,
          capacidad_max_ug_ha: p.capacidad_max_ug_ha ? parseFloat(p.capacidad_max_ug_ha) : null,
        })
        created.push(data)
      }
      onNext(created)
    } catch (err) {
      setApiError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {potreros.map((potrero, idx) => (
          <div key={potrero._key} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Potrero {idx + 1}
              </span>
              {potreros.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removePotrero(potrero._key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Potrero Norte"
                  value={potrero.nombre}
                  onChange={(e) => updatePotrero(potrero._key, "nombre", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Superficie (ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="250.00"
                  value={potrero.superficie_ha}
                  onChange={(e) => updatePotrero(potrero._key, "superficie_ha", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Capacidad máx. (UG/ha)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.80"
                  value={potrero.capacidad_max_ug_ha}
                  onChange={(e) => updatePotrero(potrero._key, "capacidad_max_ug_ha", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tipo de pastura</Label>
                <Input
                  placeholder="Brachiaria, Panicum..."
                  value={potrero.tipo_pastura}
                  onChange={(e) => updatePotrero(potrero._key, "tipo_pastura", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={addPotrero}>
        <Plus className="mr-2 h-4 w-4" />
        Agregar otro potrero
      </Button>

      <Separator />

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Atrás
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Guardando..." : "Continuar →"}
        </Button>
      </div>
    </form>
  )
}
