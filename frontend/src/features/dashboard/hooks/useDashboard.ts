import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import type { AlertasResponse, DashboardRead } from "@/types/api"

export function useDashboard() {
  return useQuery<DashboardRead>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardRead>("/api/v1/dashboard")
      return data
    },
    staleTime: 60_000,
  })
}

export function useAlertas() {
  return useQuery<AlertasResponse>({
    queryKey: ["alertas"],
    queryFn: async () => {
      const { data } = await api.get<AlertasResponse>("/api/v1/alertas")
      return data
    },
    staleTime: 60_000,
  })
}
