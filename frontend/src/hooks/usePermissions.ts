import { useMe } from "./useMe"

export function usePermissions() {
  const { data: me } = useMe()
  const rol = me?.rol ?? null

  return {
    /** Solo administrador puede crear/editar registros */
    canWrite: rol === "administrador",
    isVeterinario: rol === "veterinario",
    isPropietario: rol === "propietario",
    isAdministrador: rol === "administrador",
    rol,
  }
}
