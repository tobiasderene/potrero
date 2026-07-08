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

export interface AnimalRead {
  id: string
  establecimiento_id: string
  caravana_senacsa: string | null
  numero_campo: string | null
  sexo: string
  tipo_origen: string
  raza: string | null
  fecha_nacimiento: string | null
  fecha_nacimiento_estimada: boolean
  establecimiento_origen: string | null
  estado: string
  fecha_egreso: string | null
  tipo_egreso: string | null
  lote_actual_id: string | null
  potrero_actual_id: string | null
  categoria_actual: string | null
  created_at: string
  updated_at: string
}

export interface ErrorFila {
  fila: number
  datos: Record<string, string>
  errores: string[]
}

export interface ImportacionRead {
  id: string
  nombre_archivo: string
  total_filas: number | null
  filas_exitosas: number | null
  filas_con_error: number | null
  estado: string
  reporte_errores: ErrorFila[] | null
  created_at: string
  completado_at: string | null
}
