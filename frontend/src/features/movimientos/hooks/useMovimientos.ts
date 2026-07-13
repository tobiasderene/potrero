import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getApiError } from "@/lib/api/client"
import type { MovimientoRead } from "@/types/api"

export { getApiError }

export interface AnimalCompraItem {
  caravana_senacsa?: string | null
  numero_campo?: string | null
  sexo: "macho" | "hembra"
  categoria: string
  raza?: string | null
  fecha_nacimiento?: string | null
  fecha_nacimiento_estimada?: boolean
  establecimiento_origen_animal?: string | null
  peso_kg?: number | null
}

export interface IngresoCompraPayload {
  fecha_evento: string
  animales: AnimalCompraItem[]
  potrero_destino_id?: string | null
  lote_destino_id?: string | null
  proveedor?: string | null
  establecimiento_origen?: string | null
  numero_guia_senacsa?: string | null
  precio_unitario?: number | null
  tipo_precio?: "por_cabeza" | "por_kg" | null
  moneda?: "PYG" | "USD" | null
  observaciones?: string | null
}

export interface NacimientoPayload {
  fecha_evento: string
  madre_id: string
  padre_id?: string | null
  sexo: "macho" | "hembra"
  fecha_nacimiento: string
  fecha_nacimiento_estimada?: boolean
  raza?: string | null
  numero_campo?: string | null
  caravana_senacsa?: string | null
  potrero_destino_id?: string | null
  lote_destino_id?: string | null
  observaciones?: string | null
}

export interface TrasladoPayload {
  fecha_evento: string
  animal_ids?: string[]
  lote_id?: string
  potrero_destino_id: string
  observaciones?: string | null
}

export interface EgresoVentaPayload {
  fecha_evento: string
  animal_ids: string[]
  comprador?: string | null
  destino_venta?: "frigorifico" | "remate" | "venta_directa" | null
  precio_venta_unitario?: number | null
  peso_venta_promedio_kg?: number | null
  moneda?: "PYG" | "USD" | null
  numero_guia_senacsa?: string | null
  observaciones?: string | null
}

export interface EgresoMuertePayload {
  fecha_evento: string
  animal_id: string
  causa_muerte?: string | null
  observaciones?: string | null
}

function useMovimientoMutation<T>(endpoint: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: T) => {
      const { data } = await api.post(`/api/v1/movimientos/${endpoint}`, payload)
      return data as MovimientoRead
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animales"] })
      qc.invalidateQueries({ queryKey: ["lotes"] })
      qc.invalidateQueries({ queryKey: ["potreros"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useIngresoCompra() {
  return useMovimientoMutation<IngresoCompraPayload>("ingreso-compra")
}

export function useNacimiento() {
  return useMovimientoMutation<NacimientoPayload>("nacimiento")
}

export function useTraslado() {
  return useMovimientoMutation<TrasladoPayload>("traslado")
}

export function useEgresoVenta() {
  return useMovimientoMutation<EgresoVentaPayload>("egreso-venta")
}

export function useEgresoMuerte() {
  return useMovimientoMutation<EgresoMuertePayload>("egreso-muerte")
}

export function useMovimiento(eventoId: string) {
  return useQuery<MovimientoRead>({
    queryKey: ["movimiento", eventoId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/movimientos/${eventoId}`)
      return data
    },
    enabled: !!eventoId,
  })
}
