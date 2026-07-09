import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Scale,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useMe } from "@/hooks/useMe"
import { useDashboard, useAlertas } from "./hooks/useDashboard"
import type {
  AlertaRead,
  GdpRodeoRead,
  CargaEstablecimientoRead,
  StockRead,
  MovimientoResumenRead,
} from "@/types/api"

// ─── helpers ───────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  ingreso_compra: "Compra",
  nacimiento: "Nacimiento",
  traslado_interno: "Traslado",
  egreso_venta: "Venta",
  egreso_faena: "Faena",
  egreso_muerte: "Muerte",
}

function EstadoBadge({ estado }: { estado: "completo" | "parcial" | "sin_dato_suficiente" }) {
  if (estado === "completo") return null
  return (
    <Badge variant="outline" className="text-[10px] ml-1">
      {estado === "parcial" ? "parcial" : "sin dato"}
    </Badge>
  )
}

function SeveridadDot({ severidad }: { severidad: AlertaRead["severidad"] }) {
  const cls =
    severidad === "critica"
      ? "bg-red-500"
      : severidad === "alta"
      ? "bg-orange-500"
      : "bg-yellow-400"
  return <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${cls}`} />
}

// ─── Stock por categoría (IND-08) ─────────────────────────────

function StockCard({ stock }: { stock: StockRead | undefined }) {
  if (!stock) return <CardSkeleton title="Stock por categoría" />

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          Stock por categoría
          <EstadoBadge estado={stock.estado} />
        </CardTitle>
        <p className="text-2xl font-bold">{stock.total_activos}</p>
        <p className="text-xs text-muted-foreground -mt-1">animales activos</p>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3 space-y-1">
        {stock.por_categoria.slice(0, 8).map((c) => (
          <div key={c.categoria} className="flex justify-between text-sm">
            <span className="text-muted-foreground truncate pr-2">{c.categoria}</span>
            <span className="font-medium tabular-nums">{c.total}</span>
          </div>
        ))}
        {stock.por_categoria.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">Sin animales registrados.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Alertas ────────────────────────────────────────────────────

function AlertasCard() {
  const { data: alertas, isLoading } = useAlertas()

  if (isLoading) return <CardSkeleton title="Alertas" />

  const visibles = alertas?.alertas.slice(0, 8) ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Alertas
          {(alertas?.total_criticas ?? 0) > 0 && (
            <Badge className="bg-red-500 text-white text-[10px] px-1.5">
              {alertas!.total_criticas} crítica{alertas!.total_criticas !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
        {alertas && (
          <p className="text-xs text-muted-foreground">
            {alertas.total} alerta{alertas.total !== 1 ? "s" : ""} activa
            {alertas.total !== 1 ? "s" : ""}
            {alertas.total > 0 && ` · ${alertas.total_altas} alta${alertas.total_altas !== 1 ? "s" : ""} · ${alertas.total_medias} media${alertas.total_medias !== 1 ? "s" : ""}`}
          </p>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="pt-3 space-y-2">
        {visibles.length === 0 ? (
          <div className="flex items-center gap-2 py-2">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
          </div>
        ) : (
          visibles.map((a, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <SeveridadDot severidad={a.severidad} />
              <div className="min-w-0">
                <span className="font-medium">{a.entidad_label ?? "—"}</span>
                {" · "}
                <span className="text-muted-foreground">{a.mensaje}</span>
              </div>
            </div>
          ))
        )}
        {(alertas?.total ?? 0) > 8 && (
          <p className="text-xs text-muted-foreground pt-1">
            y {alertas!.total - 8} más…
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Carga animal + GDP (IND-05, IND-01) ─────────────────────

function CargaGdpCard({
  carga,
  gdp,
}: {
  carga: CargaEstablecimientoRead | undefined
  gdp: GdpRodeoRead | undefined
}) {
  if (!carga || !gdp) return <CardSkeleton title="Carga animal · GDP" />

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Scale className="h-4 w-4 text-primary" />
          Carga animal · GDP
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3 space-y-3">
        {/* Carga animal */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Carga establecimiento
            <EstadoBadge estado={carga.estado} />
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {carga.total_ug} UG
          </p>
          {carga.carga_promedio_ug_ha != null ? (
            <p className="text-xs text-muted-foreground">
              {carga.carga_promedio_ug_ha} UG/ha ·{" "}
              {carga.total_superficie_ha} ha totales
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sin superficie definida en potreros.
            </p>
          )}
        </div>

        <Separator />

        {/* GDP rodeo */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            GDP promedio rodeo
            <EstadoBadge estado={gdp.estado} />
          </p>
          {gdp.gdp_promedio_g_dia != null ? (
            <>
              <p className="text-2xl font-bold tabular-nums">
                {gdp.gdp_promedio_g_dia}{" "}
                <span className="text-base font-normal text-muted-foreground">g/día</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Mín {gdp.gdp_minimo_g_dia} · Máx {gdp.gdp_maximo_g_dia} ·{" "}
                {gdp.total_animales_con_gdp}/{gdp.total_animales_activos} animales
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-1">
              Sin dato suficiente — necesitás al menos 2 pesajes por animal.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Últimos movimientos ────────────────────────────────────────

function MovimientosCard({ movimientos }: { movimientos: MovimientoResumenRead[] | undefined }) {
  if (!movimientos) return <CardSkeleton title="Últimos movimientos" />

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Últimos movimientos
          </span>
          <Link
            to="/movimientos"
            className="text-xs font-normal text-muted-foreground hover:text-primary flex items-center gap-0.5"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3 space-y-2">
        {movimientos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin movimientos registrados.</p>
        ) : (
          movimientos.map((m) => (
            <div key={m.evento_id} className="flex justify-between text-sm">
              <div className="min-w-0 pr-2">
                <span className="font-medium">
                  {TIPO_LABEL[m.tipo_movimiento] ?? m.tipo_movimiento}
                </span>
                {m.potrero_destino_nombre && (
                  <span className="text-muted-foreground truncate">
                    {" · "}{m.potrero_destino_nombre}
                  </span>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="tabular-nums text-muted-foreground text-xs">
                  {m.total_animales} anim.
                </span>
                <p className="text-xs text-muted-foreground">{m.fecha_evento}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────

function CardSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground animate-pulse">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Página principal ──────────────────────────────────────────

export function DashboardPage() {
  const { data: me } = useMe()
  const { data: dashboard } = useDashboard()
  const est = me?.establecimiento

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {est && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {est.nombre}
            {est.departamento ? ` · ${est.departamento}` : " · Paraguay"}
          </p>
        )}
      </div>

      {/* Grid mobile-first: 1 col → 2 col en sm+ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StockCard stock={dashboard?.stock} />
        <AlertasCard />
        <CargaGdpCard
          carga={dashboard?.carga_establecimiento}
          gdp={dashboard?.gdp_rodeo}
        />
        <MovimientosCard movimientos={dashboard?.ultimos_movimientos} />
      </div>
    </div>
  )
}
