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
  lote_actual_nombre: string | null
  potrero_actual_id: string | null
  potrero_actual_nombre: string | null
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

export interface PesajeRead {
  evento_id: string
  fecha_evento: string
  fecha_registro: string
  tipo: "individual" | "lote_estimado"
  animal_id: string | null
  lote_id: string | null
  peso_kg: string
  cantidad_muestra: number | null
  gdp_g_dia: string | null
  dias_intervalo: number | null
  observaciones: string | null
}

export interface GdpAnimalRead {
  animal_id: string
  gdp_g_dia: string | null
  peso_anterior_kg: string | null
  dias_intervalo: number | null
  estado: "completo" | "sin_dato_suficiente"
}

export interface GdpLoteRead {
  lote_id: string
  gdp_promedio_g_dia: string | null
  gdp_minimo_g_dia: string | null
  gdp_maximo_g_dia: string | null
  total_animales_con_gdp: number
  total_animales_lote: number
  estado: "completo" | "parcial" | "sin_dato_suficiente"
}

export interface GdpPotreroRead {
  potrero_id: string
  gdp_promedio_g_dia: string | null
  gdp_minimo_g_dia: string | null
  gdp_maximo_g_dia: string | null
  total_animales_con_gdp: number
  total_animales_potrero: number
  estado: "completo" | "parcial" | "sin_dato_suficiente"
}

export interface VariacionGdpRead {
  animal_id: string
  gdp_animal_g_dia: string | null
  gdp_promedio_lote_g_dia: string | null
  porcentaje_vs_promedio: string | null
  alerta_bajo: boolean
  estado: "completo" | "parcial" | "sin_dato_suficiente"
}

export interface VacunacionRead {
  evento_id: string
  fecha_evento: string
  fecha_registro: string
  biologico: string
  laboratorio: string | null
  numero_lote_biologico: string | null
  fecha_vencimiento_biol: string | null
  dosis_ml: string | null
  via_administracion: string | null
  es_antiaftosa: boolean
  lote_id: string | null
  animal_ids: string[]
  total_animales: number
}

export interface TratamientoRead {
  evento_id: string
  fecha_evento: string
  fecha_registro: string
  animal_id: string
  diagnostico: string | null
  medicamento: string
  dosis: string | null
  via_administracion: string | null
  duracion_dias: number | null
  dias_carencia: number
  fecha_fin_carencia: string
  veterinario: string | null
  costo: string | null
  moneda_costo: string | null
  observaciones: string | null
}

export interface DiagnosticoRead {
  evento_id: string
  fecha_evento: string
  fecha_registro: string
  animal_id: string
  descripcion: string
  veterinario: string | null
  con_tratamiento: boolean
  observaciones: string | null
}

export interface CarenciaActiva {
  animal_id: string
  caravana_senacsa: string | null
  numero_campo: string | null
  medicamento: string
  fecha_fin_carencia: string
  dias_restantes: number
}

export interface ProximaAntiaftosa {
  animal_id: string
  caravana_senacsa: string | null
  numero_campo: string | null
  ultima_antiaftosa: string | null
  proxima_estimada: string | null
  dias_para_vencimiento: number | null
  estado: "al_dia" | "proximo" | "vencido" | "sin_registro"
}

export interface CalendarioSanitarioRead {
  carencias_activas: CarenciaActiva[]
  proximas_antiaftosa: ProximaAntiaftosa[]
  total_carencias: number
  total_proximas_antiaftosa: number
}

// ── Dashboard ──────────────────────────────────────────────────

export interface StockCategoriaRead {
  categoria: string
  total: number
  coeficiente_ug: string | null
}

export interface StockRead {
  por_categoria: StockCategoriaRead[]
  total_activos: number
  estado: "completo" | "sin_dato_suficiente"
}

export interface CargaEstablecimientoRead {
  total_ug: string
  total_animales: number
  total_superficie_ha: string | null
  carga_promedio_ug_ha: string | null
  estado: "completo" | "parcial" | "sin_dato_suficiente"
}

export interface GdpRodeoRead {
  gdp_promedio_g_dia: string | null
  gdp_minimo_g_dia: string | null
  gdp_maximo_g_dia: string | null
  total_animales_con_gdp: number
  total_animales_activos: number
  estado: "completo" | "parcial" | "sin_dato_suficiente"
}

export interface MovimientoResumenRead {
  evento_id: string
  tipo_movimiento: string
  fecha_evento: string
  total_animales: number
  potrero_destino_nombre: string | null
  lote_destino_nombre: string | null
}

export interface DashboardRead {
  fecha_consulta: string
  stock: StockRead
  carga_establecimiento: CargaEstablecimientoRead
  gdp_rodeo: GdpRodeoRead
  ultimos_movimientos: MovimientoResumenRead[]
}

// ── Alertas ────────────────────────────────────────────────────

export interface AlertaRead {
  tipo: string
  severidad: "critica" | "alta" | "media"
  entidad_tipo: string
  entidad_id: string | null
  entidad_label: string | null
  mensaje: string
}

export interface AlertasResponse {
  total: number
  total_criticas: number
  total_altas: number
  total_medias: number
  alertas: AlertaRead[]
}

// ── Reportes ───────────────────────────────────────────────────

export interface AnimalInventarioRow {
  id: string
  caravana_senacsa: string | null
  numero_campo: string | null
  sexo: string
  raza: string | null
  fecha_nacimiento: string | null
  categoria: string
  potrero_nombre: string | null
  lote_nombre: string | null
  coeficiente_ug: string
}

export interface ReporteInventarioRead {
  establecimiento_nombre: string
  fecha_consulta: string
  total_animales: number
  animales: AnimalInventarioRow[]
}

export interface MovimientoReporteRow {
  evento_id: string
  tipo_movimiento: string
  fecha_evento: string
  total_animales: number
  potrero_origen: string | null
  potrero_destino: string | null
  proveedor_comprador: string | null
  precio: string | null
  moneda: string | null
  numero_guia_senacsa: string | null
}

export interface ReporteMovimientosRead {
  establecimiento_nombre: string
  fecha_desde: string
  fecha_hasta: string
  total_movimientos: number
  movimientos: MovimientoReporteRow[]
}

// ── Legacy ─────────────────────────────────────────────────────

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
