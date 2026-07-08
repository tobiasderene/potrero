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
                  <Route path="/potreros" element={<PotrerosPage />} />
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
