import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, MapPin } from "lucide-react"
import { useTorreControl } from "./hooks/useTorreControl"
import { useGdpPotrero } from "@/features/pesajes/hooks/usePesajes"
import { PotreroPanelPrincipal } from "./components/PotreroPanelPrincipal"
import { ListaPotreros } from "./components/ListaPotreros"

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="border-l-4 border-border pl-5">
        <div className="h-7 w-48 rounded-lg bg-muted animate-pulse mb-2" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
      <div className="h-40 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}

export function DashboardPage() {
  const { potreros, dashboard, isLoading, isEmpty } = useTorreControl()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Auto-seleccionar: crítico primero, luego advertencia, luego el primero
  useEffect(() => {
    if (selectedId || potreros.length === 0) return
    const auto =
      potreros.find(p => p.estado === "critico") ??
      potreros.find(p => p.estado === "advertencia") ??
      potreros[0]
    setSelectedId(auto?.potrero.id ?? null)
  }, [potreros, selectedId])

  // Resetear si el potrero seleccionado desaparece de la lista
  useEffect(() => {
    if (selectedId && !potreros.some(p => p.potrero.id === selectedId)) {
      setSelectedId(null)
    }
  }, [potreros, selectedId])

  const selected = potreros.find(p => p.potrero.id === selectedId) ?? null

  // GDP se carga aquí para poder esperar que esté listo antes de mostrar el panel
  const gdpQ = useGdpPotrero(selectedId ?? "")
  const isPanelLoading = isLoading || (!!selectedId && gdpQ.isLoading)

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center">
        <div>
          <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-semibold text-foreground">Sin potreros activos</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            <Link
              to="/potreros"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Crear un potrero
            </Link>{" "}
            para comenzar a usar el dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      {/* Panel principal */}
      <div className="flex-1 min-w-0">
        {isLoading && !selected ? (
          <LoadingSkeleton />
        ) : isPanelLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : selected ? (
          <PotreroPanelPrincipal
            key={selectedId!}
            potrero={selected}
            gdp={gdpQ.data}
            lastMovements={dashboard?.ultimos_movimientos ?? []}
          />
        ) : null}
      </div>

      {/* Panel lateral */}
      <ListaPotreros
        potreros={potreros}
        selectedId={selectedId}
        onSelect={setSelectedId}
        isLoading={isLoading}
      />
    </div>
  )
}
