import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Upload, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimalForm } from "./components/AnimalForm"
import { ImportacionCSV } from "./components/ImportacionCSV"
import { useAnimales, type AnimalFilters } from "./hooks/useAnimales"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"

const CATEGORIAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]

export function AnimalesPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<AnimalFilters>({ estado: "activo", limit: 50, offset: 0 })
  const [searchTipo, setSearchTipo] = useState<"caravana" | "numero_campo">("caravana")
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showCSV, setShowCSV] = useState(false)

  const { data: potreros } = usePotreros("activo")

  const { data, isLoading } = useAnimales({
    ...filters,
    caravana: searchTipo === "caravana" ? (search || undefined) : undefined,
    numero_campo: searchTipo === "numero_campo" ? (search || undefined) : undefined,
  })

  const setFilter = (key: keyof AnimalFilters, value: string | undefined) =>
    setFilters(f => ({ ...f, [key]: value, offset: 0 }))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Animales</h1>
          {data && <p className="text-sm text-muted-foreground">{data.total} animales</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCSV(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo animal
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-1 min-w-56">
          <Select value={searchTipo} onValueChange={(v: string) => { setSearchTipo(v as "caravana" | "numero_campo"); setSearch("") }}>
            <SelectTrigger className="w-36 rounded-r-none border-r-0 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="caravana">Caravana</SelectItem>
              <SelectItem value="numero_campo">N° campo</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchTipo === "caravana" ? "AR001..." : "101..."}
              className="pl-8 rounded-l-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Select value={filters.categoria ?? ""} onValueChange={(v: string) => setFilter("categoria", v || undefined)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.potrero_id ?? ""} onValueChange={(v: string) => setFilter("potrero_id", v || undefined)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Potrero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {potreros?.items.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.estado ?? "activo"} onValueChange={(v: string) => setFilter("estado", v || undefined)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="egresado">Egresados</SelectItem>
            <SelectItem value="">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Caravana</th>
              <th className="px-4 py-3 text-left font-medium">N° campo</th>
              <th className="px-4 py-3 text-left font-medium">Categoría</th>
              <th className="px-4 py-3 text-left font-medium">Sexo</th>
              <th className="px-4 py-3 text-left font-medium">Raza</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando...</td></tr>
            )}
            {!isLoading && !data?.items.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin animales</td></tr>
            )}
            {data?.items.map(a => (
              <tr
                key={a.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/animales/${a.id}`)}
              >
                <td className="px-4 py-3 font-mono text-xs">{a.caravana_senacsa ?? "—"}</td>
                <td className="px-4 py-3">{a.numero_campo ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{a.categoria_actual?.replace("_", " ") ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{a.sexo}</td>
                <td className="px-4 py-3">{a.raza ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={a.estado === "activo" ? "default" : "secondary"}>
                    {a.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + data.limit, data.total)} de {data.total}</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={!filters.offset}
              onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - (f.limit ?? 50)) }))}
            >Anterior</Button>
            <Button
              variant="outline" size="sm"
              disabled={(filters.offset ?? 0) + data.limit >= data.total}
              onClick={() => setFilters(f => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 50) }))}
            >Siguiente</Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo animal</DialogTitle></DialogHeader>
          <AnimalForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCSV} onOpenChange={setShowCSV}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar animales desde CSV</DialogTitle></DialogHeader>
          <ImportacionCSV onClose={() => setShowCSV(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
