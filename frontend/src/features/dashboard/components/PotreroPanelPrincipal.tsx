import type { ComponentType } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Layers,
  MapPin,
  PawPrint,
  Scale,
  Stethoscope,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PotreroEnriquecido } from "../hooks/useTorreControl"
import type { AlertaRead, GdpPotreroRead, MovimientoResumenRead } from "@/types/api"

interface Props {
  potrero: PotreroEnriquecido
  gdp: GdpPotreroRead | undefined
  lastMovements: MovimientoResumenRead[]
}

// ── Visual config ──────────────────────────────────────────────

type Estado = "critico" | "advertencia" | "normal"
type Severidad = "critica" | "alta" | "media"

const ESTADO_CFG: Record<Estado, {
  dot: string
  badge: string
  border: string
  label: string
  icon: ComponentType<{ className?: string }>
}> = {
  critico: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25",
    border: "border-l-red-500",
    label: "Crítico",
    icon: AlertCircle,
  },
  advertencia: {
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25",
    border: "border-l-amber-400",
    label: "Advertencia",
    icon: AlertTriangle,
  },
  normal: {
    dot: "bg-green-500",
    badge: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/25",
    border: "border-l-green-500",
    label: "Normal",
    icon: CheckCircle2,
  },
}

const SEV_CFG: Record<Severidad, { dot: string; text: string; bg: string }> = {
  critica: { dot: "bg-red-500",    text: "text-red-700 dark:text-red-400",       bg: "bg-red-500/10 border-red-500/20" },
  alta:    { dot: "bg-amber-500",  text: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  media:   { dot: "bg-yellow-400", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
}

const TIPO_MOV: Record<string, string> = {
  ingreso_compra: "Compra",
  nacimiento: "Nacimiento",
  traslado_interno: "Traslado",
  egreso_venta: "Venta",
  egreso_faena: "Faena",
  egreso_muerte: "Muerte",
}

// ── Helpers ────────────────────────────────────────────────────

function alertLink(a: AlertaRead): string | null {
  if (a.entidad_tipo === "animal" && a.entidad_id) return `/animales/${a.entidad_id}`
  if (a.entidad_tipo === "lote") return `/lotes`
  return null
}

function fmtFloat(v: string | null, d = 1): string | null {
  if (!v) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n.toFixed(d)
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  sub,
  highlight,
}: {
  label: string
  value: string | number | null
  unit?: string
  sub?: string
  highlight?: "red" | "amber"
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] p-4",
        highlight === "red"   && "bg-red-500/8   ring-1 ring-red-500/20",
        highlight === "amber" && "bg-amber-500/8 ring-1 ring-amber-500/20",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      {value != null ? (
        <p className="text-2xl font-bold tabular-nums leading-none">
          {value}
          {unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground py-0.5">—</p>
      )}
      {sub && (
        <p
          className={cn(
            "text-xs mt-2",
            highlight === "red"
              ? "text-red-600 dark:text-red-400"
              : highlight === "amber"
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function ActionBtn({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] px-4 py-3.5 hover:bg-accent transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}

// ── Main ───────────────────────────────────────────────────────

export function PotreroPanelPrincipal({ potrero: enriched, gdp, lastMovements }: Props) {
  const { potrero, carga, lotes, alertas, estado } = enriched
  const cfg = ESTADO_CFG[estado]
  const StateIcon = cfg.icon

  // Buscar el movimiento más reciente que involucre este potrero o sus lotes
  const loteNames = new Set(lotes.map(l => l.nombre))
  const lastMovement =
    lastMovements.find(m => m.potrero_destino_nombre === potrero.nombre) ??
    lastMovements.find(m => m.lote_destino_nombre && loteNames.has(m.lote_destino_nombre))

  const ocupPct = fmtFloat(carga?.porcentaje_ocupacion ?? null, 1)
  const ocupNum = ocupPct ? parseFloat(ocupPct) : null
  const ocupHighlight: "red" | "amber" | undefined =
    ocupNum != null && ocupNum > 110 ? "red" :
    ocupNum != null && ocupNum > 90  ? "amber" :
    undefined

  const gdpValue = fmtFloat(gdp?.gdp_promedio_g_dia ?? null)
  const gdpSub = gdp?.total_animales_con_gdp
    ? `${gdp.total_animales_con_gdp} / ${gdp.total_animales_potrero} animales`
    : gdp?.estado === "sin_dato_suficiente"
    ? "Sin pesajes suficientes"
    : undefined

  return (
    <div className="p-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200">

      {/* ── Encabezado ─────────────────────────────────────────── */}
      <div className={cn("border-l-4 pl-5 mb-8", cfg.border)}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{potrero.nombre}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
              {potrero.superficie_ha && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {fmtFloat(potrero.superficie_ha, 0) ?? potrero.superficie_ha} ha
                </span>
              )}
              {potrero.tipo_pastura && <span>{potrero.tipo_pastura}</span>}
              {lotes.length > 0 && (
                <span>{lotes.length} lote{lotes.length !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full shrink-0",
              cfg.badge,
            )}
          >
            <StateIcon className="h-3.5 w-3.5" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Animales"
          value={carga?.total_animales ?? null}
        />
        <StatCard
          label="Ocupación"
          value={ocupPct}
          unit="%"
          sub={
            ocupNum != null
              ? ocupNum > 110
                ? `Sobrecargado (${(ocupNum - 100).toFixed(0)}% exceso)`
                : ocupNum > 90
                ? "Cerca del límite"
                : "Dentro del límite"
              : undefined
          }
          highlight={ocupHighlight}
        />
        <StatCard
          label="Carga animal"
          value={fmtFloat(carga?.carga_actual_ug ?? null)}
          unit="UG"
          sub={
            carga?.capacidad_total_ug
              ? `/ ${fmtFloat(carga.capacidad_total_ug, 0)} UG capacidad`
              : undefined
          }
        />
        <StatCard
          label="GDP promedio"
          value={gdpValue}
          unit={gdpValue ? "g/día" : undefined}
          sub={gdpSub}
        />
      </div>

      {/* ── Lotes presentes ────────────────────────────────────── */}
      {lotes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Lotes presentes
          </h3>
          <div className="flex flex-wrap gap-2">
            {lotes.map(l => (
              <Link
                key={l.id}
                to="/lotes"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-card shadow-[0_1px_3px_0_rgb(0_0_0/0.06)] hover:bg-accent transition-colors"
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{l.nombre}</span>
                <span className="text-muted-foreground text-xs capitalize">· {l.proposito}</span>
                <span className="text-muted-foreground text-xs">· {l.total_animales} anim.</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Alertas ────────────────────────────────────────────── */}
      <div className="mb-8">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Alertas{alertas.length > 0 ? ` (${alertas.length})` : ""}
        </h3>

        {alertas.length === 0 ? (
          <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border bg-green-500/10 border-green-500/25">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">Sin alertas activas en este potrero.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.map((a, i) => {
              const sc = SEV_CFG[a.severidad]
              const link = alertLink(a)

              const content = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm",
                    sc.bg,
                  )}
                >
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", sc.dot)} />
                  <div className="min-w-0 flex-1">
                    {a.entidad_label && (
                      <span className={cn("font-semibold", sc.text)}>
                        {a.entidad_label}
                        <span className="mx-1 opacity-40">·</span>
                      </span>
                    )}
                    <span className="text-foreground/80">{a.mensaje}</span>
                  </div>
                  {link && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              )

              return link ? (
                <Link key={i} to={link} className="block group hover:opacity-90 transition-opacity">
                  {content}
                </Link>
              ) : (
                <div key={i}>{content}</div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Último movimiento ──────────────────────────────────── */}
      {lastMovement && (
        <div className="mb-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Último movimiento
          </h3>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)] text-sm">
            <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">
                {TIPO_MOV[lastMovement.tipo_movimiento] ?? lastMovement.tipo_movimiento}
              </span>
              {lastMovement.lote_destino_nombre && (
                <span className="text-muted-foreground"> · {lastMovement.lote_destino_nombre}</span>
              )}
              <span className="text-muted-foreground"> · {lastMovement.total_animales} animales</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {lastMovement.fecha_evento}
            </span>
          </div>
        </div>
      )}

      {/* ── Acciones rápidas ───────────────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Acciones rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ActionBtn to="/animales" icon={PawPrint} label="Ver animales" />
          <ActionBtn to="/pesajes" icon={Scale} label="Registrar pesaje" />
          <ActionBtn to="/movimientos" icon={ArrowLeftRight} label="Registrar movimiento" />
          <ActionBtn to="/sanidad" icon={Stethoscope} label="Registrar tratamiento" />
          <ActionBtn to="/reportes" icon={FileText} label="Ver reportes" />
          <ActionBtn to="/lotes" icon={BarChart3} label="Ver lotes" />
        </div>
      </div>
    </div>
  )
}
