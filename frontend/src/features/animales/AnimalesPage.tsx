import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Upload, Search, ChevronLeft, ChevronRight } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimalForm } from "./components/AnimalForm"
import { ImportacionCSV } from "./components/ImportacionCSV"
import { useAnimales, type AnimalFilters } from "./hooks/useAnimales"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import type { AnimalRead } from "@/types/api"

const CATEGORIAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]

// Sentinel para representar "sin filtro" en los Select (Radix no permite value="")
const ALL = "__todos__"

// Referencia estable para evitar loops en useReactTable mientras `data` es undefined
const EMPTY_ANIMALES: AnimalRead[] = []

const columns: ColumnDef<AnimalRead>[] = [
  {
    accessorKey: "caravana_senacsa",
    header: "Caravana",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.caravana_senacsa ?? "—"}</span>
    ),
  },
  {
    accessorKey: "numero_campo",
    header: "N° campo",
    cell: ({ row }) => row.original.numero_campo ?? "—",
  },
  {
    id: "categoria",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.categoria_actual?.replace(/_/g, " ") ?? "—"}</span>
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
    cell: ({ row }) => row.original.raza ?? "—",
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
      <Badge variant={row.original.estado === "activo" ? "default" : "secondary"}>
        {row.original.estado}
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
    caravana: searchTipo === "caravana" ? (search || undefined) : undefined,
    numero_campo: searchTipo === "numero_campo" ? (search || undefined) : undefined,
    cursor,
  })

  const resetCursor = () => {
    setCursor(undefined)
    setCursorStack([])
  }

  const setFilter = (key: keyof AnimalFilters, value: string | undefined) => {
    setFilters(f => ({ ...f, [key]: value }))
    resetCursor()
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    resetCursor()
  }

  const handleSearchTipo = (value: "caravana" | "numero_campo") => {
    setSearchTipo(value)
    setSearch("")
    resetCursor()
  }

  const goNext = () => {
    if (data?.next_cursor) {
      setCursorStack(s => [...s, cursor])
      setCursor(data.next_cursor)
    }
  }

  const goPrev = () => {
    const stack = [...cursorStack]
    const prev = stack.pop()
    setCursorStack(stack)
    setCursor(prev)
  }

  const limit = filters.limit ?? 20
  const currentPage = cursorStack.length + 1
  const totalPages = data ? Math.ceil(data.total / limit) : 1

  const table = useReactTable({
    data: data?.items ?? EMPTY_ANIMALES,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
          <Select value={searchTipo} onValueChange={(v: string) => handleSearchTipo(v as "caravana" | "numero_campo")}>
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
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>
        <Select
          value={filters.categoria ?? ALL}
          onValueChange={(v: string) => setFilter("categoria", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.potrero_id ?? ALL}
          onValueChange={(v: string) => setFilter("potrero_id", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Potrero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {potreros?.items.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.lote_id ?? ALL}
          onValueChange={(v: string) => setFilter("lote_id", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Lote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {lotesData?.items.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.estado ?? "activo"}
          onValueChange={(v: string) => setFilter("estado", v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="egresado">Egresados</SelectItem>
            <SelectItem value={ALL}>Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="px-4 py-3 text-left font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && !table.getRowModel().rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  Sin animales
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/animales/${row.original.id}`)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación cursor */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {currentPage} de {totalPages} · {data.total} animales</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={cursorStack.length === 0} onClick={goPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!data.has_next} onClick={goNext}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
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