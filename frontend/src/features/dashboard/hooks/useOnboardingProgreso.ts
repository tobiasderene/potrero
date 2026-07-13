import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface OnboardingProgreso {
  tiene_potreros: boolean
  tiene_categorias: boolean
  tiene_lotes: boolean
  tiene_animales: boolean
  porcentaje: number
}

export function useOnboardingProgreso() {
  return useQuery<OnboardingProgreso>({
    queryKey: ["onboarding-progreso"],
    queryFn: async () => {
      const { data } = await api.get<OnboardingProgreso>("/api/v1/onboarding/progreso")
      return data
    },
    staleTime: 30_000,
  })
}
