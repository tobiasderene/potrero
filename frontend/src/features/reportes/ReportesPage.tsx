import { useState } from "react"
import { FileSpreadsheet, Printer, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  useReporteInventario,
  useReporteMovimientos,
  useExportInventario,
  useExportMovimientos,
} from "./hooks/useReportes"
import type { ReporteInventarioRead, ReporteMovimientosRead } from "@/types/api"

const TIPO_LABEL: Record<string, string> = {
  ingreso_compra: "Compra",
  nacimiento: "Nacimiento",
  traslado_interno: "Traslado",
  egreso_venta: "Venta",
  egreso_faena: "Faena",
  egreso_muerte: "Muerte",
}

// ─── Inventario ────────────────────────────────────────────────

function InventarioDialog({
  data,
  onClose,
}: {
  data: ReporteInventarioRead
  onClose: () => void
}) {
  const exportXlsx = useExportInventario()
  const preview = data.animales.slice(0, 50)

  const porCat = new Map<string, number>()
  data.animales.forEach((a) => porCat.set(a.categoria, (porCat.get(a.categoria) ?? 0) + 1))

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col print:max-w-full print:max-h-none">
      <DialogHeader className="print:mb-4">
        <DialogTitle>
          Inventario — {data.establecimiento_nombre}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          {data.fecha_consulta} · {data.total_animales} animales activos
        </p>
      </DialogHeader>

      {/* Resumen por categoría */}
      <div className="flex flex-wrap gap-2 py-2 print:mb-3">
        {Array.from(porCat.entries()).map(([cat, n]) => (
          <Badge key={cat} variant="secondary" className="text-xs">
            {cat}: {n}
          </Badge>
        ))}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto print:overflow-visible">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-muted/60 sticky top-0 print:static">
            <tr>
              {["Caravana", "Nro Campo", "Categoría", "Sexo", "Raza", "Potrero", "Lote", "UG"].map((h) => (
                <th key={h} className="text-left px-2 py-1.5 border border-border font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((a, i) => (
              <tr key={a.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="px-2 py-1 border border-border">{a.caravana_senacsa ?? "—"}</td>
                <td className="px-2 py-1 border border-border">{a.numero_campo ?? "—"}</td>
                <td className="px-2 py-1 border border-border">{a.categoria}</td>
                <td className="px-2 py-1 border border-border capitalize">{a.sexo}</td>
                <td className="px-2 py-1 border border-border">{a.raza ?? "—"}</td>
                <td className="px-2 py-1 border border-border">{a.potrero_nombre ?? "—"}</td>
                <td className="px-2 py-1 border border-border">{a.lote_nombre ?? "—"}</td>
                <td className="px-2 py-1 border border-border">{a.coeficiente_ug}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.total_animales > 50 && (
          <p className="text-xs text-muted-foreground mt-2 px-1 print:hidden">
            Mostrando 50 de {data.total_animales} animales. El Excel contiene todos.
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-3 border-t print:hidden">
        <Button size="sm" onClick={() => exportXlsx(data)}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          Descargar Excel
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1.5" />
          Imprimir / PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
          Cerrar
        </Button>
      </div>
    </DialogContent>
  )
}

// ─── Movimientos ───────────────────────────────────────────────

function MovimientosDialog({
  data,
  onClose,
}: {
  data: ReporteMovimientosRead
  onClose: () => void
}) {
  const exportXlsx = useExportMovimientos()

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col print:max-w-full">
      <DialogHeader>
        <DialogTitle>
          Movimientos — {data.establecimiento_nombre}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          {data.fecha_desde} al {data.fecha_hasta} · {data.total_movimientos} eventos
        </p>
      </DialogHeader>

      <div className="flex-1 overflow-auto print:overflow-visible">
        {data.movimientos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sin movimientos en el período seleccionado.
          </p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-muted/60 sticky top-0 print:static">
              <tr>
                {["Fecha", "Tipo", "Animales", "Origen", "Destino", "Proveedor/Comprador", "Precio", "Guía"].map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 border border-border font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.movimientos.map((m, i) => (
                <tr key={m.evento_id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-2 py-1 border border-border">{m.fecha_evento}</td>
                  <td className="px-2 py-1 border border-border">{TIPO_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}</td>
                  <td className="px-2 py-1 border border-border text-center">{m.total_animales}</td>
                  <td className="px-2 py-1 border border-border">{m.potrero_origen ?? "—"}</td>
                  <td className="px-2 py-1 border border-border">{m.potrero_destino ?? "—"}</td>
                  <td className="px-2 py-1 border border-border">{m.proveedor_comprador ?? "—"}</td>
                  <td className="px-2 py-1 border border-border">
                    {m.precio ? `${m.precio} ${m.moneda ?? ""}` : "—"}
                  </td>
                  <td className="px-2 py-1 border border-border">{m.numero_guia_senacsa ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t print:hidden">
        <Button size="sm" onClick={() => exportXlsx(data)} disabled={data.total_movimientos === 0}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          Descargar Excel
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()} disabled={data.total_movimientos === 0}>
          <Printer className="h-4 w-4 mr-1.5" />
          Imprimir / PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
          Cerrar
        </Button>
      </div>
    </DialogContent>
  )
}

// ─── Página principal ──────────────────────────────────────────

export function ReportesPage() {
  const [showInventario, setShowInventario] = useState(false)
  const [showMovimientos, setShowMovimientos] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 8) + "01"
  const [fechaDesde, setFechaDesde] = useState(firstOfMonth)
  const [fechaHasta, setFechaHasta] = useState(today)

  const inventario = useReporteInventario(showInventario)
  const movimientos = useReporteMovimientos(fechaDesde, fechaHasta, showMovimientos)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground mt-1">
          Exportá inventario y movimientos a Excel o PDF.
        </p>
      </div>

      {/* Inventario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventario actual</CardTitle>
          <CardDescription>
            Todos los animales activos con categoría, potrero y lote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowInventario(true)}
            disabled={inventario.isFetching}
          >
            <Search className="h-4 w-4 mr-1.5" />
            {inventario.isFetching ? "Cargando…" : "Ver inventario"}
          </Button>
        </CardContent>
      </Card>

      {/* Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos del período</CardTitle>
          <CardDescription>
            Compras, ventas, traslados y egresos en un rango de fechas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label htmlFor="fecha-desde">Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                max={fechaHasta}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha-hasta">Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                min={fechaDesde}
                max={today}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowMovimientos(true)}
            disabled={!fechaDesde || !fechaHasta || movimientos.isFetching}
          >
            <Search className="h-4 w-4 mr-1.5" />
            {movimientos.isFetching ? "Cargando…" : "Ver movimientos"}
          </Button>
          {movimientos.isError && (
            <p className="text-sm text-destructive">
              Error al cargar los movimientos. Verificá el rango de fechas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fichas individuales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ficha individual del animal</CardTitle>
          <CardDescription>
            Abrí la ficha del animal desde la sección Animales y usá el botón "Imprimir ficha".
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Dialogs */}
      <Dialog open={showInventario} onOpenChange={setShowInventario}>
        {inventario.data && (
          <InventarioDialog
            data={inventario.data}
            onClose={() => setShowInventario(false)}
          />
        )}
        {inventario.isLoading && (
          <DialogContent>
            <p className="text-center py-8 text-muted-foreground">Cargando inventario…</p>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={showMovimientos} onOpenChange={setShowMovimientos}>
        {movimientos.data && (
          <MovimientosDialog
            data={movimientos.data}
            onClose={() => setShowMovimientos(false)}
          />
        )}
        {movimientos.isLoading && (
          <DialogContent>
            <p className="text-center py-8 text-muted-foreground">Cargando movimientos…</p>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
