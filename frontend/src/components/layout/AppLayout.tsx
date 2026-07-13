import { useState, type ComponentType } from "react"
import { NavLink, Outlet } from "react-router-dom"
import {
  ArrowLeftRight,
  Calendar,
  FileText,
  LayoutDashboard,
  Layers,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  PawPrint,
  Scale,
  Stethoscope,
  Weight,
  X,
} from "lucide-react"
import { useAuth } from "@/features/auth/AuthContext"
import { useMe } from "@/hooks/useMe"
import { usePermissions } from "@/hooks/usePermissions"
import { cn } from "@/lib/utils"

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
      { to: "/animales",    icon: PawPrint,       label: "Animales",   roles: ["propietario", "administrador"] },
      { to: "/lotes",       icon: Layers,          label: "Lotes",      roles: ["propietario", "administrador"] },
      { to: "/movimientos", icon: ArrowLeftRight,  label: "Movimientos",roles: ["administrador"] },
      { to: "/pesajes",     icon: Weight,          label: "Pesajes",    roles: ["administrador"] },
    ],
  },
  {
    label: "Sanidad",
    items: [
      { to: "/sanidad",             icon: Stethoscope, label: "Registro",   roles: ["propietario", "administrador", "veterinario"] },
      { to: "/sanidad/calendario",  icon: Calendar,    label: "Calendario", roles: ["propietario", "administrador", "veterinario"] },
    ],
  },
  {
    label: "Configuración",
    items: [
      { to: "/potreros",   icon: MapPin,  label: "Potreros",      roles: ["propietario", "administrador"] },
      { to: "/categorias", icon: Scale,   label: "Categorías UG", roles: ["administrador"] },
      { to: "/reportes",   icon: FileText,label: "Reportes",      roles: ["propietario", "administrador"] },
    ],
  },
]

// ── Sidebar ────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { signOut } = useAuth()
  const { data: me } = useMe()
  const { rol } = usePermissions()

  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => !rol || item.roles.includes(rol)),
  })).filter(g => g.items.length > 0)

  const initial = me?.email?.[0]?.toUpperCase() ?? "?"

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar shadow-[1px_0_8px_0_rgb(0_0_0/0.05)]">

      {/* Wordmark */}
      <div className="flex h-14 items-center gap-2.5 px-4 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-campo-600 shrink-0">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-sidebar-foreground">
          Novillo
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Establecimiento */}
      {me?.establecimiento && (
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            Establecimiento
          </p>
          <p className="text-sm font-medium text-sidebar-foreground truncate leading-snug">
            {me.establecimiento.nombre}
          </p>
        </div>
      )}

      <div className="mx-3 h-px bg-sidebar-border/60 shrink-0" />

      {/* Nav groups */}
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
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
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

      {/* User + sign out */}
      <div className="shrink-0 p-2 pt-1">
        <div className="mx-1 mb-2 h-px bg-sidebar-border/60" />
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-campo-100">
            <span className="text-xs font-semibold text-campo-700">{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate leading-snug">
              {me?.email}
            </p>
            {rol && (
              <p className="text-[10px] text-muted-foreground capitalize">{rol}</p>
            )}
          </div>
        </div>
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

// ── Layout ─────────────────────────────────────────────────────

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:sticky lg:top-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-campo-600">
              <Leaf className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Novillo</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
