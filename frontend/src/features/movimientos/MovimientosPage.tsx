import { useState } from "react"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { EgresoMuerteForm } from "./components/EgresoMuerteForm"
import { EgresoVentaForm } from "./components/EgresoVentaForm"
import { IngresoCompraForm } from "./components/IngresoCompraForm"
import { NacimientoForm } from "./components/NacimientoForm"
import { TrasladoForm } from "./components/TrasladoForm"

type TipoMovimiento =
  | "ingreso_compra"
  | "nacimiento"
  | "traslado"
  | "egreso_venta"
  | "egreso_muerte"

const TIPOS: {
  value: TipoMovimiento
  label: string
  description: string
  color: string
}[] = [
  {
    value: "ingreso_compra",
    label: "Ingreso por compra",
    description: "Registrar animales comprados externamente",
    color: "bg-green-50 border-green-200 hover:border-green-400",
  },
  {
    value: "nacimiento",
    label: "Nacimiento",
    description: "Registrar cría nacida en el establecimiento",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
  },
  {
    value: "traslado",
    label: "Traslado interno",
    description: "Mover animales entre potreros",
    color: "bg-orange-50 border-orange-200 hover:border-orange-400",
  },
  {
    value: "egreso_venta",
    label: "Egreso por venta",
    description: "Registrar venta de animales (requiere caravana SENACSA)",
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
  },
  {
    value: "egreso_muerte",
    label: "Egreso por muerte",
    description: "Registrar baja por muerte",
    color: "bg-red-50 border-red-200 hover:border-red-400",
  },
]

type Step = "selector" | "formulario" | "confirmacion"

interface SuccessResult {
  evento_id: string
  tipo: TipoMovimiento
  advertencias?: string[]
  extra?: Record<string, unknown>
}

export function MovimientosPage() {
  const [step, setStep] = useState<Step>("selector")
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoMovimiento | null>(null)
  const [resultado, setResultado] = useState<SuccessResult | null>(null)

  const { data: potrerosData } = usePotreros()
  const { data: lotesData } = useLotes("activo")
  const potreros = potrerosData?.items ?? []
  const lotes = lotesData?.items ?? []

  function seleccionarTipo(tipo: TipoMovimiento) {
    setTipoSeleccionado(tipo)
    setStep("formulario")
  }

  function onSuccess(result: { evento_id: string; [key: string]: unknown }) {
    const { evento_id, ...rest } = result
    setResultado({ evento_id, tipo: tipoSeleccionado!, ...rest })
    setStep("confirmacion")
  }

  function resetear() {
    setStep("selector")
    setTipoSeleccionado(null)
    setResultado(null)
  }

  const tipoLabel = TIPOS.find((t) => t.value === tipoSeleccionado)?.label ?? ""

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        {step !== "selector" && (
          <Button variant="ghost" size="icon" onClick={resetear}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            {step === "selector" && "Seleccioná el tipo de movimiento"}
            {step === "formulario" && tipoLabel}
            {step === "confirmacion" && "Movimiento registrado"}
          </p>
        </div>
      </div>

      {/* Paso 1: selector de tipo */}
      {step === "selector" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.value}
              className={`text-left rounded-lg border-2 p-4 transition-colors ${tipo.color}`}
              onClick={() => seleccionarTipo(tipo.value)}
            >
              <p className="font-semibold">{tipo.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{tipo.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: formulario */}
      {step === "formulario" && tipoSeleccionado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tipoLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {tipoSeleccionado === "ingreso_compra" && (
              <IngresoCompraForm
                potreros={potreros}
                lotes={lotes}
                onSuccess={onSuccess}
                onCancel={resetear}
              />
            )}
            {tipoSeleccionado === "nacimiento" && (
              <NacimientoForm
                potreros={potreros}
                lotes={lotes}
                onSuccess={onSuccess}
                onCancel={resetear}
              />
            )}
            {tipoSeleccionado === "traslado" && (
              <TrasladoForm
                potreros={potreros}
                onSuccess={(r) => onSuccess(r)}
                onCancel={resetear}
              />
            )}
            {tipoSeleccionado === "egreso_venta" && (
              <EgresoVentaForm
                onSuccess={onSuccess}
                onCancel={resetear}
              />
            )}
            {tipoSeleccionado === "egreso_muerte" && (
              <EgresoMuerteForm
                onSuccess={onSuccess}
                onCancel={resetear}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Paso 3: confirmación */}
      {step === "confirmacion" && resultado && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Movimiento registrado exitosamente</p>
                <p className="text-sm text-green-700">{tipoLabel}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              ID: {resultado.evento_id}
            </div>

            {resultado.advertencias && resultado.advertencias.length > 0 && (
              <Alert>
                <AlertDescription className="space-y-1">
                  {resultado.advertencias.map((adv, i) => (
                    <p key={i} className="text-amber-700">⚠ {adv}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={resetear}>Registrar otro movimiento</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
