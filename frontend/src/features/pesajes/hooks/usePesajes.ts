import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import type { GdpAnimalRead, GdpLoteRead, PesajeRead, VariacionGdpRead } from "@/types/api"

export interface PesajeIndividualPayload {
  fecha_evento: string
  animal_id: string
  peso_kg: number
  observaciones?: string | null
}

export interface PesajeLotePayload {
  fecha_evento: string
  lote_id: string
  peso_kg: number
  cantidad_muestra: number
  observaciones?: string | null
}

export function useRegistrarPesajeIndividual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PesajeIndividualPayload) => {
      const { data } = await api.post<PesajeRead>("/api/v1/pesajes/individual", payload)
      return data
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["pesajes", "animal", v.animal_id] })
      qc.invalidateQueries({ queryKey: ["gdp", "animal", v.animal_id] })
    },
  })
}

export function useRegistrarPesajeLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PesajeLotePayload) => {
      const { data } = await api.post<PesajeRead>("/api/v1/pesajes/lote", payload)
      return data
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["pesajes", "lote", v.lote_id] })
      qc.invalidateQueries({ queryKey: ["gdp", "lote", v.lote_id] })
    },
  })
}

export function usePesajesAnimal(animalId: string) {
  return useQuery({
    queryKey: ["pesajes", "animal", animalId],
    queryFn: async () => {
      const { data } = await api.get<PesajeRead[]>(`/api/v1/pesajes/animal/${animalId}`)
      return data
    },
    enabled: !!animalId,
  })
}

export function usePesajesLote(loteId: string) {
  return useQuery({
    queryKey: ["pesajes", "lote", loteId],
    queryFn: async () => {
      const { data } = await api.get<PesajeRead[]>(`/api/v1/pesajes/lote/${loteId}`)
      return data
    },
    enabled: !!loteId,
  })
}

export function useAnularPesaje() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventoId }: { eventoId: string; loteId: string }) => {
      await api.patch(`/api/v1/pesajes/${eventoId}/anular`)
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["pesajes", "lote", v.loteId] })
      qc.invalidateQueries({ queryKey: ["gdp", "lote", v.loteId] })
    },
  })
}

export function useGdpAnimal(animalId: string) {
  return useQuery({
    queryKey: ["gdp", "animal", animalId],
    queryFn: async () => {
      const { data } = await api.get<GdpAnimalRead>(`/api/v1/pesajes/animal/${animalId}/gdp`)
      return data
    },
    enabled: !!animalId,
  })
}

export function useGdpLote(loteId: string) {
  return useQuery({
    queryKey: ["gdp", "lote", loteId],
    queryFn: async () => {
      const { data } = await api.get<GdpLoteRead>(`/api/v1/pesajes/lote/${loteId}/gdp`)
      return data
    },
    enabled: !!loteId,
  })
}

export function useVariacionGdp(animalId: string) {
  return useQuery({
    queryKey: ["gdp", "variacion", animalId],
    queryFn: async () => {
      const { data } = await api.get<VariacionGdpRead>(`/api/v1/pesajes/animal/${animalId}/variacion`)
      return data
    },
    enabled: !!animalId,
  })
}

export { getApiError }
