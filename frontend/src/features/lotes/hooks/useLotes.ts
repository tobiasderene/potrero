import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import type { LoteRead, Paginated } from "@/types/api"

export { getApiError }

interface LoteCreate {
  nombre: string
  proposito: string
  potrero_principal_id?: string | null
  fecha_formacion: string
  peso_promedio_ingreso?: number | null
  peso_objetivo_salida?: number | null
  plazo_estimado_dias?: number | null
}

interface LoteUpdate {
  nombre?: string
  proposito?: string
  potrero_principal_id?: string | null
  peso_promedio_ingreso?: number | null
  peso_objetivo_salida?: number | null
  plazo_estimado_dias?: number | null
}

export function useLotes(estado?: string) {
  return useQuery<Paginated<LoteRead>>({
    queryKey: ["lotes", estado],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" })
      if (estado) params.set("estado", estado)
      const { data } = await api.get(`/api/v1/lotes?${params}`)
      return data
    },
  })
}

export function useLote(id: string) {
  return useQuery<LoteRead>({
    queryKey: ["lote", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/lotes/${id}`)
      return data
    },
  })
}

export function useCreateLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LoteCreate) => {
      const { data } = await api.post("/api/v1/lotes", payload)
      return data as LoteRead
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lotes"] }),
  })
}

export function useUpdateLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: LoteUpdate & { id: string }) => {
      const { data } = await api.patch(`/api/v1/lotes/${id}`, payload)
      return data as LoteRead
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lotes"] }),
  })
}

export function useAsignarAnimalesLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ loteId, animalIds }: { loteId: string; animalIds: string[] }) => {
      const { data } = await api.post(`/api/v1/lotes/${loteId}/animales`, { animal_ids: animalIds })
      return data
    },
    onSuccess: (_data, { loteId }) => {
      qc.invalidateQueries({ queryKey: ["lotes"] })
      qc.invalidateQueries({ queryKey: ["lote", loteId] })
      qc.invalidateQueries({ queryKey: ["animales"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
