export interface EstablecimientoRead {
  id: string
  nombre: string
  nombre_propietario: string
  fecha_inicio_sistema: string
  departamento: string | null
  coordenadas_lat: string | null
  coordenadas_lng: string | null
  numero_senacsa: string | null
  ejercicio_inicio_mes: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CategoriaRead {
  id: string
  establecimiento_id: string
  nombre: string
  coeficiente_ug: string
  activo: boolean
  updated_at: string
}

export interface PotreroRead {
  id: string
  establecimiento_id: string
  nombre: string
  superficie_ha: string | null
  tipo_pastura: string | null
  capacidad_max_ug_ha: string | null
  estado: string
  created_at: string
  updated_at: string
}

export interface MeResponse {
  user_id: string
  email: string | null
  establecimiento: EstablecimientoRead | null
  rol: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
