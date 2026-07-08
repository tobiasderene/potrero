import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import type { Paginated, PotreroRead } from "@/types/api"

interface PotreroPayload {
  nombre?: string
  superficie_ha?: number | null
  tipo_pastura?: string | null
  capacidad_max_ug_ha?: number | null
  estado?: string
}

export function usePotreros(estado?: string) {
  return useQuery({
    queryKey: ["potreros", estado ?? "todos"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", offset: "0" })
      if (estado) params.set("estado", estado)
      const { data } = await api.get<Paginated<PotreroRead>>(`/api/v1/potreros?${params}`)
      return data
    },
  })
}

export function useCreatePotrero() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: PotreroPayload) => {
      const { data } = await api.post<PotreroRead>("/api/v1/potreros", body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["potreros"] }),
  })
}

export function useUpdatePotrero() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: PotreroPayload & { id: string }) => {
      const { data } = await api.patch<PotreroRead>(`/api/v1/potreros/${id}`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["potreros"] }),
  })
}

export { getApiError }
