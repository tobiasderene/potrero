import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import type {
  CalendarioSanitarioRead,
  DiagnosticoRead,
  TratamientoRead,
  VacunacionRead,
} from "@/types/api"

export interface VacunacionPayload {
  fecha_evento: string
  biologico: string
  laboratorio?: string | null
  numero_lote_biologico?: string | null
  fecha_vencimiento_biol?: string | null
  dosis_ml?: number | null
  via_administracion?: string | null
  es_antiaftosa: boolean
  animal_ids?: string[] | null
  lote_id?: string | null
  observaciones?: string | null
}

export interface TratamientoPayload {
  fecha_evento: string
  animal_id: string
  diagnostico?: string | null
  medicamento: string
  dosis?: string | null
  via_administracion?: string | null
  duracion_dias?: number | null
  dias_carencia: number
  veterinario?: string | null
  costo?: number | null
  moneda_costo?: "PYG" | "USD" | null
  observaciones?: string | null
}

export interface DiagnosticoPayload {
  fecha_evento: string
  animal_id: string
  descripcion: string
  veterinario?: string | null
  con_tratamiento: boolean
  observaciones?: string | null
}

export function useRegistrarVacunacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VacunacionPayload) => {
      const { data } = await api.post<VacunacionRead>("/api/v1/sanidad/vacunaciones", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sanidad"] })
      qc.invalidateQueries({ queryKey: ["calendario"] })
    },
  })
}

export function useRegistrarTratamiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TratamientoPayload) => {
      const { data } = await api.post<TratamientoRead>("/api/v1/sanidad/tratamientos", payload)
      return data
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["sanidad", "tratamientos", v.animal_id] })
      qc.invalidateQueries({ queryKey: ["calendario"] })
    },
  })
}

export function useRegistrarDiagnostico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: DiagnosticoPayload) => {
      const { data } = await api.post<DiagnosticoRead>("/api/v1/sanidad/diagnosticos", payload)
      return data
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["sanidad", "diagnosticos", v.animal_id] })
    },
  })
}

export function useTratamientosAnimal(animalId: string) {
  return useQuery({
    queryKey: ["sanidad", "tratamientos", animalId],
    queryFn: async () => {
      const { data } = await api.get<TratamientoRead[]>(`/api/v1/sanidad/animal/${animalId}/tratamientos`)
      return data
    },
    enabled: !!animalId,
  })
}

export function useVacunacionesAnimal(animalId: string) {
  return useQuery({
    queryKey: ["sanidad", "vacunaciones", animalId],
    queryFn: async () => {
      const { data } = await api.get<VacunacionRead[]>(`/api/v1/sanidad/animal/${animalId}/vacunaciones`)
      return data
    },
    enabled: !!animalId,
  })
}

export function useCalendarioSanitario() {
  return useQuery({
    queryKey: ["calendario"],
    queryFn: async () => {
      const { data } = await api.get<CalendarioSanitarioRead>("/api/v1/sanidad/calendario")
      return data
    },
  })
}

export { getApiError }
