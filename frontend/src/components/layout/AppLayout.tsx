import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/features/auth/AuthContext"
import { useMe } from "@/hooks/useMe"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
]

export function AppLayout() {
  const { signOut } = useAuth()
  const { data: me } = useMe()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center px-4">
          <span className="font-bold tracking-tight text-sidebar-foreground">PMR Ganadero</span>
        </div>

        {me?.establecimiento && (
          <div className="px-4 pb-3">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {me.establecimiento.nombre}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {me.email}
            </p>
          </div>
        )}

        <Separator />

        <nav className="flex-1 space-y-1 p-2 mt-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  )
}
