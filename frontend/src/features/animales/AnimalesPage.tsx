import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Upload } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { AnimalForm } from "./components/AnimalForm"
import { ImportacionCSV } from "./components/ImportacionCSV"
import { useAnimales, type AnimalFilters } from "./hooks/useAnimales"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import type { AnimalRead } from "@/types/api"
import { ChevronLeft, ChevronRight, PawPrint } from "lucide-react"

const CATEGORIAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]
const ALL = "__todos__"
const EMPTY_DATA: AnimalRead[] = []

const ESTADO_VARIANT: Record<string, "success" | "inactive"> = {
  activo: "success",
  egresado: "inactive",
}

const columns: ColumnDef<AnimalRead>[] = [
  {
    accessorKey: "caravana_senacsa",
    header: "Caravana",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-foreground/80">
        {row.original.caravana_senacsa ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    accessorKey: "numero_campo",
    header: "N° campo",
    cell: ({ row }) => row.original.numero_campo ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: "categoria",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.categoria_actual?.replace(/_/g, " ") ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    accessorKey: "sexo",
    header: "Sexo",
    cell: ({ row }) => <span className="capitalize">{row.original.sexo}</span>,
  },
  {
    accessorKey: "raza",
    header: "Raza",
    cell: ({ row }) => row.original.raza ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: "potrero",
    header: "Potrero",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.potrero_actual_nombre ?? "—"}</span>
    ),
  },
  {
    id: "lote",
    header: "Lote",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.lote_actual_nombre ?? "—"}</span>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={ESTADO_VARIANT[row.original.estado] ?? "outline"}>
        {row.original.estado === "activo" ? "Activo" : "Egresado"}
      </Badge>
    ),
  },
]

export function AnimalesPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<AnimalFilters>({ estado: "activo", limit: 20 })
  const [searchTipo, setSearchTipo] = useState<"caravana" | "numero_campo">("caravana")
  const [search, setSearch] = useState("")
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showCSV, setShowCSV] = useState(false)

  const { data: potreros } = usePotreros("activo")
  const { data: lotesData } = useLotes("activo")

  const { data, isLoading } = useAnimales({
    ...filters,
    caravana:      searchTipo === "caravana"      ? (search || undefined) : undefined,
    numero_campo:  searchTipo === "numero_campo"  ? (search || undefined) : undefined,
    cursor,
  })

  const resetCursor = () => { setCursor(undefined); setCursorStack([]) }

  const setFilter = (key: keyof AnimalFilters, value: string | undefined) => {
    setFilters(f => ({ ...f, [key]: value }))
    resetCursor()
  }

  const handleSearch = (value: string) => { setSearch(value); resetCursor() }
  const handleSearchTipo = (value: "caravana" | "numero_campo") => {
    setSearchTipo(value); setSearch(""); resetCursor()
  }

  const goNext = () => {
    if (data?.next_cursor) { setCursorStack(s => [...s, cursor]); setCursor(data.next_cursor) }
  }
  const goPrev = () => {
    const stack = [...cursorStack]; const prev = stack.pop()
    setCursorStack(stack); setCursor(prev)
  }

  // Conteo de filtros activos (excluye defaults)
  const activeFilterCount = [
    filters.categoria,
    filters.potrero_id,
    filters.lote_id,
    filters.estado !== "activo" ? filters.estado : undefined,
    search || undefined,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilters({ estado: "activo", limit: 20 })
    setSearch("")
    setSearchTipo("caravana")
    resetCursor()
  }

  const limit = filters.limit ?? 20
  const currentPage = cursorStack.length + 1
  const totalPages = data ? Math.ceil(data.total / limit) : 1

  const table = useReactTable({
    data: data?.items ?? EMPTY_DATA,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Animales"
        description={data ? `${data.total.toLocaleString()} animales` : undefined}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCSV(true)}>
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Nuevo animal
            </Button>
          </div>
        }
      />

      <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
        {/* Búsqueda por caravana / número de campo */}
        <div className="flex flex-1 min-w-56">
          <Select
            value={searchTipo}
            onValueChange={(v: string) => handleSearchTipo(v as "caravana" | "numero_campo")}
          >
            <SelectTrigger className="w-36 rounded-r-none border-r-0 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="caravana">Caravana</SelectItem>
              <SelectItem value="numero_campo">N° campo</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchTipo === "caravana" ? "AR001…" : "101…"}
              className="pl-8 rounded-l-none"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <Select
          value={filters.categoria ?? ALL}
          onValueChange={v => setFilter("categoria", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {CATEGORIAS.map(c => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.potrero_id ?? ALL}
          onValueChange={v => setFilter("potrero_id", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Potrero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los potreros</SelectItem>
            {potreros?.items.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.lote_id ?? ALL}
          onValueChange={v => setFilter("lote_id", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los lotes</SelectItem>
            {lotesData?.items.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.estado ?? "activo"}
          onValueChange={v => setFilter("estado", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="egresado">Egresados</SelectItem>
            <SelectItem value={ALL}>Todos</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        table={table}
        isLoading={isLoading}
        onRowClick={row => navigate(`/animales/${row.id}`)}
        emptyState={
          <EmptyState
            icon={<PawPrint className="h-6 w-6" />}
            title="Sin animales"
            description={
              activeFilterCount > 0
                ? "Ningún animal coincide con los filtros activos."
                : "Registrá tu primer animal o importá desde CSV para empezar."
            }
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
              ) : (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  Nuevo animal
                </Button>
              )
            }
          />
        }
      />

      {data && data.total > limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {currentPage} de {totalPages} · {data.total.toLocaleString()} animales
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={cursorStack.length === 0} onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!data.has_next} onClick={goNext}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
