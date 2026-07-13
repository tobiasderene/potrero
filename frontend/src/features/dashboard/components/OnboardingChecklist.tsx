import { Link } from "react-router-dom"
import { CheckCircle2, Circle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useOnboardingProgreso } from "../hooks/useOnboardingProgreso"

const ITEMS = [
  { key: "tiene_potreros", label: "Crear al menos un potrero", href: "/potreros" },
  { key: "tiene_categorias", label: "Configurar categorías UG", href: "/categorias" },
  { key: "tiene_lotes", label: "Crear el primer lote", href: "/lotes" },
  { key: "tiene_animales", label: "Registrar el primer animal", href: "/animales" },
] as const

export function OnboardingChecklist() {
  const { data, isLoading } = useOnboardingProgreso()

  if (isLoading || !data || data.porcentaje === 100) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Configuración inicial</p>
        <span className="text-xs text-muted-foreground">{data.porcentaje}%</span>
      </div>
      <Progress value={data.porcentaje} className="h-1.5" />
      <ul className="space-y-1.5">
        {ITEMS.map(({ key, label, href }) => {
          const done = data[key]
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-campo-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              {done ? (
                <span className="text-muted-foreground line-through">{label}</span>
              ) : (
                <Link
                  to={href}
                  className="text-foreground underline underline-offset-2 hover:text-campo-700 transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
