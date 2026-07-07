import { useMe } from "@/hooks/useMe"

export function DashboardPage() {
  const { data: me } = useMe()
  const est = me?.establecimiento

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {est && (
          <p className="text-muted-foreground mt-1">
            {est.nombre} · {est.departamento ?? "Paraguay"}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <p className="font-medium">Sprint 2 — Animales</p>
        <p className="text-sm mt-1">
          El inventario de animales estará disponible en el próximo sprint.
        </p>
      </div>
    </div>
  )
}
