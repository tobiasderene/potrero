import { useQuery } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import { api } from "@/lib/api/client"
import type { ReporteInventarioRead, ReporteMovimientosRead } from "@/types/api"

export function useReporteInventario(enabled: boolean) {
  return useQuery<ReporteInventarioRead>({
    queryKey: ["reporte-inventario"],
    queryFn: async () => {
      const { data } = await api.get<ReporteInventarioRead>("/api/v1/reportes/inventario")
      return data
    },
    enabled,
    staleTime: 0,
  })
}

export function useReporteMovimientos(
  fechaDesde: string,
  fechaHasta: string,
  enabled: boolean
) {
  return useQuery<ReporteMovimientosRead>({
    queryKey: ["reporte-movimientos", fechaDesde, fechaHasta],
    queryFn: async () => {
      const { data } = await api.get<ReporteMovimientosRead>("/api/v1/reportes/movimientos", {
        params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
      })
      return data
    },
    enabled,
    staleTime: 0,
  })
}

export function useExportInventario() {
  return (data: ReporteInventarioRead) => {
    const rows = data.animales.map((a) => ({
      "Caravana SENACSA": a.caravana_senacsa ?? "",
      "Nro Campo": a.numero_campo ?? "",
      "Categoría": a.categoria,
      "Sexo": a.sexo,
      "Raza": a.raza ?? "",
      "Fecha Nacimiento": a.fecha_nacimiento ?? "",
      "Potrero": a.potrero_nombre ?? "",
      "Lote": a.lote_nombre ?? "",
      "Coef. UG": parseFloat(a.coeficiente_ug),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    // Ancho de columnas
    ws["!cols"] = [20, 16, 18, 10, 16, 18, 20, 20, 10].map((w) => ({ wch: w }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Inventario")

    // Hoja resumen por categoría
    const porCat = new Map<string, number>()
    data.animales.forEach((a) => porCat.set(a.categoria, (porCat.get(a.categoria) ?? 0) + 1))
    const resumen = Array.from(porCat.entries()).map(([cat, total]) => ({
      Categoría: cat,
      "Total Animales": total,
    }))
    const ws2 = XLSX.utils.json_to_sheet(resumen)
    XLSX.utils.book_append_sheet(wb, ws2, "Por Categoría")

    XLSX.writeFile(wb, `inventario_${data.fecha_consulta}.xlsx`)
  }
}

export function useExportMovimientos() {
  return (data: ReporteMovimientosRead) => {
    const LABELS: Record<string, string> = {
      ingreso_compra: "Compra",
      nacimiento: "Nacimiento",
      traslado_interno: "Traslado",
      egreso_venta: "Venta",
      egreso_faena: "Faena",
      egreso_muerte: "Muerte",
    }
    const rows = data.movimientos.map((m) => ({
      "Fecha": m.fecha_evento,
      "Tipo": LABELS[m.tipo_movimiento] ?? m.tipo_movimiento,
      "Animales": m.total_animales,
      "Potrero Origen": m.potrero_origen ?? "",
      "Potrero Destino": m.potrero_destino ?? "",
      "Proveedor/Comprador": m.proveedor_comprador ?? "",
      "Precio": m.precio ? parseFloat(m.precio) : "",
      "Moneda": m.moneda ?? "",
      "Guía SENACSA": m.numero_guia_senacsa ?? "",
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [14, 14, 10, 20, 20, 22, 14, 10, 18].map((w) => ({ wch: w }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos")
    XLSX.writeFile(wb, `movimientos_${data.fecha_desde}_${data.fecha_hasta}.xlsx`)
  }
}
