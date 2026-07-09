import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/features/auth/AuthContext"
import { RequireAuth } from "@/features/auth/RequireAuth"
import { RequireEstablecimiento } from "@/features/auth/RequireEstablecimiento"
import { LoginPage } from "@/features/auth/LoginPage"
import { OnboardingPage } from "@/features/onboarding/OnboardingPage"
import { AppLayout } from "@/components/layout/AppLayout"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { PotrerosPage } from "@/features/potreros/PotrerosPage"
import { CategoriasPage } from "@/features/categorias/CategoriasPage"
import { AnimalesPage } from "@/features/animales/AnimalesPage"
import { AnimalFichaPage } from "@/features/animales/AnimalFichaPage"
import { LotesPage } from "@/features/lotes/LotesPage"
import { MovimientosPage } from "@/features/movimientos/MovimientosPage"
import { PesajesPage } from "@/features/pesajes/PesajesPage"
import { SanidadPage } from "@/features/sanidad/SanidadPage"
import { CalendarioSanitarioPage } from "@/features/sanidad/CalendarioSanitarioPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<OnboardingPage />} />

              <Route element={<RequireEstablecimiento />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/animales" element={<AnimalesPage />} />
                  <Route path="/animales/:id" element={<AnimalFichaPage />} />
                  <Route path="/lotes" element={<LotesPage />} />
                  <Route path="/movimientos" element={<MovimientosPage />} />
                  <Route path="/potreros" element={<PotrerosPage />} />
                  <Route path="/categorias" element={<CategoriasPage />} />
                  <Route path="/pesajes" element={<PesajesPage />} />
                  <Route path="/sanidad" element={<SanidadPage />} />
                  <Route path="/sanidad/calendario" element={<CalendarioSanitarioPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
