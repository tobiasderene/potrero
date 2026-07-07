import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configuración inicial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paso {step + 1} de {STEPS.length}
          </p>
          <Progress value={progress} className="mt-3 h-1.5" />
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
                onNext={(est) => {
                  setEstablecimiento(est)
                  setStep(1)
                }}
              />
            )}
            {step === 1 && (
              <StepPotreros
                onNext={(pts) => {
                  setPotreros(pts)
                  setStep(2)
                }}
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
