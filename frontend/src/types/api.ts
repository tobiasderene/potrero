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

export interface PaginatedCursor<T> {
  items: T[]
  total: number
  limit: number
  next_cursor: string | null
  has_next: boolean
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

export interface LoteRead {
  id: string
  establecimiento_id: string
  nombre: string
  proposito: string
  potrero_principal_id: string | null
  fecha_formacion: string
  fecha_cierre: string | null
  peso_promedio_ingreso: string | null
  peso_objetivo_salida: string | null
  plazo_estimado_dias: number | null
  estado: string
  total_animales: number
  created_at: string
  updated_at: string
}

export interface MovimientoRead {
  evento_id: string
  tipo_movimiento: string
  fecha_evento: string
  fecha_registro: string
  observaciones: string | null
  animal_ids: string[]
  potrero_origen_id: string | null
  potrero_destino_id: string | null
  lote_destino_id: string | null
  proveedor: string | null
  establecimiento_origen: string | null
  numero_guia_senacsa: string | null
  precio_unitario: string | null
  tipo_precio: string | null
  moneda: string | null
  comprador: string | null
  destino_venta: string | null
  precio_venta_unitario: string | null
  peso_venta_promedio_kg: string | null
  causa_muerte: string | null
  advertencias: string[]
}

export interface CargaAnimalRead {
  potrero_id: string
  potrero_nombre: string
  superficie_ha: string | null
  capacidad_max_ug_ha: string | null
  capacidad_total_ug: string | null
  carga_actual_ug: string
  total_animales: number
  porcentaje_ocupacion: string | null
  estado_carga: "completo" | "parcial" | "sin_dato_suficiente"
  semaforo: "verde" | "amarillo" | "rojo" | null
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
