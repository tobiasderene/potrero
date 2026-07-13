import axios from "axios"
import { supabase } from "@/lib/supabase"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0
    if (status >= 500) {
      return "Error interno del servidor. Intentá de nuevo en unos minutos."
    }
    const detail = err.response?.data?.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg ?? String(d)).join(". ")
    return err.message
  }
  return "Error inesperado"
}
