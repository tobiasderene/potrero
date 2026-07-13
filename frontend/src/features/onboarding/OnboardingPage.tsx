import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Leaf } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StepEstablecimiento } from "./steps/StepEstablecimiento"
import { StepPotreros } from "./steps/StepPotreros"
import { StepCategorias } from "./steps/StepCategorias"
import type { EstablecimientoRead, PotreroRead } from "@/types/api"

const STEPS = [
  { title: "Establecimiento", description: "Datos generales de tu estancia" },
  { title: "Potreros", description: "Dividí tu campo en potreros" },
  { title: "Categorías UG", description: "Coeficientes de Unidad Ganadera" },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [, setEstablecimiento] = useState<EstablecimientoRead | null>(null)
  const [, setPotreros] = useState<PotreroRead[]>([])

  const current = STEPS[step]
  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-campo-600">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Novillo</span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Configuración inicial</h1>
            <span className="text-sm text-muted-foreground">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex-1 rounded-md p-2 text-center text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.title}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{current.title}</CardTitle>
            <CardDescription>{current.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <StepEstablecimiento
                onNext={(est) => { setEstablecimiento(est); setStep(1) }}
              />
            )}
            {step === 1 && (
              <StepPotreros
                onNext={(pts) => { setPotreros(pts); setStep(2) }}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <StepCategorias
                onFinish={() => navigate("/dashboard", { replace: true })}
                onBack={() => setStep(1)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
