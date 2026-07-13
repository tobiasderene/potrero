import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import type { AnimalRead, ImportacionRead, PaginatedCursor } from "@/types/api"

export interface AnimalFilters {
  caravana?: string
  numero_campo?: string
  categoria?: string
  potrero_id?: string
  lote_id?: string
  estado?: string
  limit?: number
  cursor?: string
  enabled?: boolean
}

export interface AnimalCreatePayload {
  caravana_senacsa?: string | null
  numero_campo?: string | null
  sexo: "macho" | "hembra"
  tipo_origen: "nacido" | "comprado"
  categoria: string
  raza?: string | null
  fecha_nacimiento?: string | null
  fecha_nacimiento_estimada?: boolean
  establecimiento_origen?: string | null
  potrero_id?: string | null
}

export interface AnimalUpdatePayload {
  caravana_senacsa?: string | null
  numero_campo?: string | null
  raza?: string | null
  fecha_nacimiento?: string | null
  fecha_nacimiento_estimada?: boolean
  establecimiento_origen?: string | null
}

export function useAnimales(filters: AnimalFilters = {}) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery({
    queryKey: ["animales", queryFilters],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (queryFilters.caravana) params.set("caravana", queryFilters.caravana)
      if (queryFilters.numero_campo) params.set("numero_campo", queryFilters.numero_campo)
      if (queryFilters.categoria) params.set("categoria", queryFilters.categoria)
      if (queryFilters.potrero_id) params.set("potrero_id", queryFilters.potrero_id)
      if (queryFilters.lote_id) params.set("lote_id", queryFilters.lote_id)
      if (queryFilters.estado) params.set("estado", queryFilters.estado)
      if (queryFilters.cursor) params.set("cursor", queryFilters.cursor)
      params.set("limit", String(queryFilters.limit ?? 20))
      const { data } = await api.get<PaginatedCursor<AnimalRead>>(`/api/v1/animales?${params}`)
      return data
    },
  })
}

export function useAnimal(id: string) {
  return useQuery({
    queryKey: ["animales", id],
    queryFn: async () => {
      const { data } = await api.get<AnimalRead>(`/api/v1/animales/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCrearAnimal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AnimalCreatePayload) => {
      const { data } = await api.post<AnimalRead>("/api/v1/animales", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["animales"] }),
  })
}

export function useActualizarAnimal(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AnimalUpdatePayload) => {
      const { data } = await api.patch<AnimalRead>(`/api/v1/animales/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animales"] })
      qc.invalidateQueries({ queryKey: ["animales", id] })
    },
  })
}

export function useCambiarCategoria(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (categoria: string) => {
      const { data } = await api.post<AnimalRead>(`/api/v1/animales/${id}/categoria`, { categoria })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animales"] })
      qc.invalidateQueries({ queryKey: ["animales", id] })
    },
  })
}

export function useImportarCSV() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivo, loteId }: { archivo: File; loteId?: string }) => {
      const form = new FormData()
      form.append("archivo", archivo)
      if (loteId) form.append("lote_id", loteId)
      const { data } = await api.post<ImportacionRead>("/api/v1/importaciones", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animales"] })
      qc.invalidateQueries({ queryKey: ["lotes"] })
    },
  })
}

export { getApiError }
