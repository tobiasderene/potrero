import { Navigate, Outlet } from "react-router-dom"
import { useMe } from "@/hooks/useMe"

export function RequireEstablecimiento() {
  const { data, isLoading, isError } = useMe()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    )
  }

  if (isError || !data?.establecimiento) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
