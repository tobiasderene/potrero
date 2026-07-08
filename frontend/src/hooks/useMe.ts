import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import type { MeResponse } from "@/types/api"

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>("/api/v1/auth/me")
      return data
    },
    retry: false,
  })
}
