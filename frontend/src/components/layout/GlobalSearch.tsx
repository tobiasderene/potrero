import { useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Layers, MapPin, PawPrint, Search } from "lucide-react"
import { api } from "@/lib/api/client"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { useDebounce } from "@/hooks/useDebounce"
import type { AnimalRead, PaginatedCursor } from "@/types/api"

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const debouncedQ = useDebounce(query.trim(), 250)
  const isSearching = debouncedQ.length >= 2

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Potreros y Lotes — filtrado local sobre datos ya cacheados en la app
  const potrerosQ = usePotreros()
  const lotesQ = useLotes()

  // Animales — búsqueda por caravana y numero_campo en paralelo
  const animalesCaravanaQ = useQuery({
    queryKey: ["global-search", "caravana", debouncedQ],
    queryFn: async () => {
      const params = new URLSearchParams({ caravana: debouncedQ, limit: "5" })
      const { data } = await api.get<PaginatedCursor<AnimalRead>>(`/api/v1/animales?${params}`)
      return data.items
    },
    enabled: isSearching,
    staleTime: 15_000,
  })
  const animalesNcQ = useQuery({
    queryKey: ["global-search", "numero_campo", debouncedQ],
    queryFn: async () => {
      const params = new URLSearchParams({ numero_campo: debouncedQ, limit: "5" })
      const { data } = await api.get<PaginatedCursor<AnimalRead>>(`/api/v1/animales?${params}`)
      return data.items
    },
    enabled: isSearching,
    staleTime: 15_000,
  })

  const q = debouncedQ.toLowerCase()
  const potreros = isSearching
    ? (potrerosQ.data?.items ?? []).filter(p => p.nombre.toLowerCase().includes(q)).slice(0, 4)
    : []
  const lotes = isSearching
    ? (lotesQ.data?.items ?? []).filter(l => l.nombre.toLowerCase().includes(q)).slice(0, 4)
    : []
  const animalMap = new Map<string, AnimalRead>()
  for (const a of (animalesCaravanaQ.data ?? [])) animalMap.set(a.id, a)
  for (const a of (animalesNcQ.data ?? [])) animalMap.set(a.id, a)
  const animales = [...animalMap.values()].slice(0, 4)

  const hasResults = potreros.length + lotes.length + animales.length > 0

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ESC cierra, ⌘K / Ctrl+K abre
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function goTo(path: string) {
    navigate(path)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar…"
          className="w-full rounded-lg border border-input bg-muted/40 pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
        />
      </div>

      {open && isSearching && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {!hasResults ? (
            <p className="px-4 py-5 text-center text-sm text-muted-foreground">
              Sin resultados para "{query}"
            </p>
          ) : (
            <div className="py-1">
              {potreros.length > 0 && (
                <Group label="Potreros">
                  {potreros.map(p => (
                    <Item
                      key={p.id}
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label={p.nombre}
                      sub={p.estado}
                      onClick={() => goTo("/potreros")}
                    />
                  ))}
                </Group>
              )}
              {lotes.length > 0 && (
                <Group label="Lotes">
                  {lotes.map(l => (
                    <Item
                      key={l.id}
                      icon={<Layers className="h-3.5 w-3.5" />}
                      label={l.nombre}
                      sub={`${l.proposito} · ${l.total_animales} anim.`}
                      onClick={() => goTo("/lotes")}
                    />
                  ))}
                </Group>
              )}
              {animales.length > 0 && (
                <Group label="Animales">
                  {animales.map(a => (
                    <Item
                      key={a.id}
                      icon={<PawPrint className="h-3.5 w-3.5" />}
                      label={a.caravana_senacsa ?? a.numero_campo ?? "Sin identificar"}
                      sub={[a.categoria_actual, a.potrero_actual_nombre].filter(Boolean).join(" · ")}
                      onClick={() => goTo(`/animales/${a.id}`)}
                    />
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

function Item({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: ReactNode
  label: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="font-medium truncate flex-1">{label}</span>
      {sub && <span className="text-xs text-muted-foreground truncate">{sub}</span>}
    </button>
  )
}
