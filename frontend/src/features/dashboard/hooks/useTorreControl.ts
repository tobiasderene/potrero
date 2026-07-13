import { useMemo } from "react"
import { usePotreros, usePotrerosCarga } from "@/features/potreros/hooks/usePotreros"
import { useAlertas, useDashboard } from "./useDashboard"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import type { AlertaRead, CargaAnimalRead, LoteRead, PotreroRead } from "@/types/api"

export interface PotreroEnriquecido {
  potrero: PotreroRead
  carga: CargaAnimalRead | null
  lotes: LoteRead[]
  alertas: AlertaRead[]
  estado: "critico" | "advertencia" | "normal"
}

function deriveEstado(
  carga: CargaAnimalRead | null,
  alertas: AlertaRead[],
): "critico" | "advertencia" | "normal" {
  if (carga?.semaforo === "rojo" || alertas.some(a => a.severidad === "critica"))
    return "critico"
  if (
    carga?.semaforo === "amarillo" ||
    alertas.some(a => a.severidad === "alta" || a.severidad === "media")
  )
    return "advertencia"
  return "normal"
}

export function useTorreControl() {
  const potrerosQ = usePotreros("activo")
  const cargasQ = usePotrerosCarga()
  const alertasQ = useAlertas()
  const lotesQ = useLotes("activo")
  const dashQ = useDashboard()

  const potreros = useMemo<PotreroEnriquecido[]>(() => {
    const items = potrerosQ.data?.items ?? []
    const cargas = cargasQ.data ?? []
    const alertasAll = alertasQ.data?.alertas ?? []
    const lotesAll = lotesQ.data?.items ?? []

    const enriched = items.map((p): PotreroEnriquecido => {
      const carga = cargas.find(c => c.potrero_id === p.id) ?? null
      const lotes = lotesAll.filter(l => l.potrero_principal_id === p.id)
      const loteIds = new Set(lotes.map(l => l.id))
      const alertas = alertasAll.filter(
        a =>
          (a.entidad_tipo === "potrero" && a.entidad_id === p.id) ||
          (a.entidad_tipo === "lote" && a.entidad_id !== null && loteIds.has(a.entidad_id)) ||
          (a.entidad_tipo === "animal" && a.potrero_id === p.id),
      )
      return { potrero: p, carga, lotes, alertas, estado: deriveEstado(carga, alertas) }
    })

    const ord: Record<string, number> = { critico: 0, advertencia: 1, normal: 2 }
    return enriched.sort((a, b) => ord[a.estado] - ord[b.estado])
  }, [potrerosQ.data, cargasQ.data, alertasQ.data, lotesQ.data])

  return {
    potreros,
    dashboard: dashQ.data,
    isLoading: potrerosQ.isLoading || cargasQ.isLoading,
    isEmpty: !potrerosQ.isLoading && potreros.length === 0,
  }
}
