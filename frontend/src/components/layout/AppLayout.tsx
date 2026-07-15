import { Fragment, useState, type ComponentType } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  ArrowLeftRight,
  Calendar,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Layers,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Moon,
  PawPrint,
  Scale,
  Stethoscope,
  Sun,
  Weight,
  X,
} from "lucide-react"
import { useAuth } from "@/features/auth/AuthContext"
import { useMe } from "@/hooks/useMe"
import { usePermissions } from "@/hooks/usePermissions"
import { useDarkMode } from "@/hooks/useDarkMode"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "./GlobalSearch"
import { UserMenu } from "./UserMenu"
import { OnboardingChecklist } from "@/features/dashboard/components/OnboardingChecklist"

// ── Nav structure ──────────────────────────────────────────────

type NavItem = {
  to: string
  icon: ComponentType<{ className?: string }>
  label: string
  roles: string[]
}

type NavGroup = {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["propietario", "administrador", "veterinario"] },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { to: "/animales",    icon: PawPrint,      label: "Animales",    roles: ["propietario", "administrador"] },
      { to: "/lotes",       icon: Layers,         label: "Lotes",       roles: ["propietario", "administrador"] },
      { to: "/movimientos", icon: ArrowLeftRight, label: "Movimientos", roles: ["administrador"] },
      { to: "/pesajes",     icon: Weight,         label: "Pesajes",     roles: ["administrador"] },
    ],
  },
  {
    label: "Sanidad",
    items: [
      { to: "/sanidad",            icon: Stethoscope, label: "Sanidad",   roles: ["propietario", "administrador", "veterinario"] },
      { to: "/sanidad/calendario", icon: Calendar,    label: "Calendario", roles: ["propietario", "administrador", "veterinario"] },
    ],
  },
  {
    label: "Configuración",
    items: [
      { to: "/potreros",   icon: MapPin,   label: "Potreros",      roles: ["propietario", "administrador"] },
      { to: "/categorias", icon: Scale,    label: "Categorías UG", roles: ["administrador"] },
      { to: "/reportes",   icon: FileText, label: "Reportes",      roles: ["propietario", "administrador"] },
    ],
  },
]

// ── Icon-only sidebar (desktop) ────────────────────────────────

function NavTooltipItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="group/nav relative flex items-center">
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )
        }
      >
        <Icon className="h-4 w-4" />
      </NavLink>

      {/* Tooltip */}
      <div
        className={cn(
          "pointer-events-none absolute left-full ml-3 z-50",
          "opacity-0 -translate-x-1",
          "group-hover/nav:opacity-100 group-hover/nav:translate-x-0",
          "transition-all duration-150 ease-out",
        )}
      >
        <span className="whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md">
          {label}
        </span>
      </div>
    </div>
  )
}

function Sidebar() {
  const { rol } = usePermissions()

  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => !rol || item.roles.includes(rol)),
  })).filter(g => g.items.length > 0)

  return (
    <aside className="flex h-full w-14 flex-col items-center bg-sidebar pt-2 pb-3 shrink-0 shadow-[1px_0_8px_0_rgb(0_0_0/0.05)]">
      <nav className="flex flex-1 flex-col items-center gap-0.5 w-full px-2.5">
        {visibleGroups.map((group, gi) => (
          <div
            key={gi}
            className={cn(
              "flex flex-col items-center gap-0.5 w-full",
              gi > 0 && "mt-2 pt-2 border-t border-sidebar-border/60",
            )}
          >
            {group.items.map(({ to, icon, label }) => (
              <NavTooltipItem key={to} to={to} icon={icon} label={label} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

// ── Full sidebar (mobile overlay) ─────────────────────────────

function MobileSidebar({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth()
  const { data: me } = useMe()
  const { rol } = usePermissions()
  const { dark, toggle } = useDarkMode()

  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => !rol || item.roles.includes(rol)),
  })).filter(g => g.items.length > 0)

  const initial = me?.email?.[0]?.toUpperCase() ?? "?"

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar shadow-[1px_0_8px_0_rgb(0_0_0/0.05)]">
      <div className="flex h-12 items-center gap-2.5 px-4 shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-campo-600 shrink-0">
          <Leaf className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Novillo</span>
        <button
          onClick={onClose}
          className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-3 h-px bg-sidebar-border/60 shrink-0" />

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {visibleGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <OnboardingChecklist />

      <div className="shrink-0 p-2 pt-1">
        <div className="mx-1 mb-2 h-px bg-sidebar-border/60" />
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-campo-600/20">
            <span className="text-xs font-semibold text-campo-600 dark:text-campo-200">{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{me?.email}</p>
            {rol && <p className="text-[10px] text-muted-foreground capitalize">{rol}</p>}
          </div>
        </div>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors duration-150"
        >
          {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {dark ? "Modo claro" : "Modo oscuro"}
        </button>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

// ── Breadcrumb ─────────────────────────────────────────────────

type Crumb = { label: string; href?: string }

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation()

  if (pathname.startsWith("/animales/")) {
    return [{ label: "Animales", href: "/animales" }, { label: "Ficha" }]
  }
  if (pathname === "/sanidad/calendario") {
    return [{ label: "Sanidad", href: "/sanidad" }, { label: "Calendario" }]
  }

  const labels: Record<string, string> = {
    "/dashboard":   "Dashboard",
    "/animales":    "Animales",
    "/lotes":       "Lotes",
    "/movimientos": "Movimientos",
    "/potreros":    "Potreros",
    "/categorias":  "Categorías UG",
    "/pesajes":     "Pesajes",
    "/sanidad":     "Sanidad",
    "/reportes":    "Reportes",
  }

  const label = labels[pathname]
  return label ? [{ label }] : []
}

function HeaderBreadcrumb() {
  const crumbs = useBreadcrumbs()
  const { data: me } = useMe()
  const nombre = me?.establecimiento?.nombre

  return (
    <div className="flex items-center gap-1.5 min-w-0 shrink-0">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-campo-600 shrink-0">
        <Leaf className="h-3.5 w-3.5 text-white" />
      </div>

      {nombre && (
        <>
          <span className="hidden md:block text-sm font-semibold text-foreground truncate max-w-[160px]">
            {nombre}
          </span>
          {crumbs.length > 0 && (
            <ChevronRight className="hidden md:block h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          )}
        </>
      )}

      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          )}
          {crumb.href ? (
            <NavLink
              to={crumb.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 truncate max-w-[100px]"
            >
              {crumb.label}
            </NavLink>
          ) : (
            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
              {crumb.label}
            </span>
          )}
        </Fragment>
      ))}
    </div>
  )
}

// ── Layout ─────────────────────────────────────────────────────

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3 z-40">

        {/* Mobile: hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb */}
        <HeaderBreadcrumb />

        {/* Search — centrado */}
        <div className="flex-1 flex justify-center px-2">
          <GlobalSearch />
        </div>

        {/* User menu */}
        <UserMenu />
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col">
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 flex h-full">
              <MobileSidebar onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 overflow-auto bg-background">
          <div key={pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
