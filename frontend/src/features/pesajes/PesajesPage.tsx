import { useState } from "react"
import { CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { PesajeIndividualForm } from "./components/PesajeIndividualForm"
import { PesajeLoteForm } from "./components/PesajeLoteForm"
import { GdpLoteCard } from "./components/GdpLoteCard"
import { GdpPotreroCard } from "./components/GdpPotreroCard"
import { PesajesHistorial } from "./components/PesajesHistorial"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { usePotreros } from "@/features/potreros/hooks/usePotreros"
import { usePesajesLote, useAnularPesaje } from "./hooks/usePesajes"
import { AnimalSearchSelect } from "./components/AnimalSearchSelect"
import type { AnimalRead } from "@/types/api"

export function PesajesPage() {
  const [showIndividual, setShowIndividual] = useState(false)
  const [showLote, setShowLote] = useState(false)
  const [animalSeleccionado, setAnimalSeleccionado] = useState<AnimalRead | null>(null)
  const [loteGdpId, setLoteGdpId] = useState("")
  const [potreroGdpId, setPotreroGdpId] = useState("")
  const [lastResult, setLastResult] = useState<string | null>(null)

  const { data: lotesData } = useLotes("activo")
  const lotes = lotesData?.items ?? []
  const { data: potrerosData } = usePotreros("activo")
  const potreros = potrerosData?.items ?? []

  const { data: pesajesLote } = usePesajesLote(loteGdpId)
  const { mutate: anular, isPending: anulando } = useAnularPesaje()

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title="Pesajes"
        description="Registrá pesajes individuales o de lote y consultá la ganancia diaria de peso."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLote(true)}>
              Pesaje de lote
            </Button>
            <Button size="sm" onClick={() => setShowIndividual(true)}>
              <Plus className="h-4 w-4" />
              Pesaje individual
            </Button>
          </div>
        }
      />

      {lastResult && (
        <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {lastResult}
        </div>
      )}

      <Tabs defaultValue="gdp-lote">
        <TabsList>
          <TabsTrigger value="gdp-lote">GDP por Lote</TabsTrigger>
          <TabsTrigger value="gdp-potrero">GDP por Potrero</TabsTrigger>
        </TabsList>

        <TabsContent value="gdp-lote" className="space-y-4 pt-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Seleccionar lote</Label>
            <Select value={loteGdpId} onValueChange={setLoteGdpId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar lote…" />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loteGdpId && <GdpLoteCard loteId={loteGdpId} />}

          {loteGdpId && pesajesLote && pesajesLote.length > 0 && (
            <PesajesHistorial
              pesajes={pesajesLote}
              loteId={loteGdpId}
              anular={anular}
              anulando={anulando}
            />
          )}
        </TabsContent>

        <TabsContent value="gdp-potrero" className="space-y-4 pt-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Seleccionar potrero</Label>
            <Select value={potreroGdpId} onValueChange={setPotreroGdpId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar potrero…" />
              </SelectTrigger>
              <SelectContent>
                {potreros.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {potreroGdpId && <GdpPotreroCard potreroId={potreroGdpId} />}
        </TabsContent>
      </Tabs>

      {/* Dialog pesaje individual */}
      <Dialog
        open={showIndividual}
        onOpenChange={(open) => { setShowIndividual(open); if (!open) setAnimalSeleccionado(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pesaje individual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!animalSeleccionado ? (
              <AnimalSearchSelect onSelect={setAnimalSeleccionado} />
            ) : (
              <>
                <div className="rounded-md bg-muted px-3 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono font-medium">
                      {animalSeleccionado.caravana_senacsa ?? animalSeleccionado.numero_campo}
                    </span>
                    <span className="text-muted-foreground ml-2 capitalize">
                      {animalSeleccionado.categoria_actual?.replace(/_/g, " ") ?? ""}
                    </span>
                    {animalSeleccionado.lote_actual_nombre && (
                      <span className="text-muted-foreground"> · {animalSeleccionado.lote_actual_nombre}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setAnimalSeleccionado(null)}
                  >
                    cambiar
                  </button>
                </div>
                <PesajeIndividualForm
                  animalId={animalSeleccionado.id}
                  onSuccess={(r) => {
                    const gdp = r.gdp_g_dia ? `GDP: ${Number(r.gdp_g_dia).toFixed(0)} g/día` : "GDP: sin dato previo"
                    setLastResult(`Pesaje registrado · Peso: ${r.peso_kg} kg · ${gdp}`)
                    setShowIndividual(false)
                    setAnimalSeleccionado(null)
                  }}
                  onCancel={() => { setShowIndividual(false); setAnimalSeleccionado(null) }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pesaje de lote */}
      <Dialog open={showLote} onOpenChange={setShowLote}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pesaje de lote</DialogTitle></DialogHeader>
          <PesajeLoteForm
            lotes={lotes}
            onSuccess={(r) => {
              setLastResult(`Pesaje de lote registrado · Peso promedio: ${r.peso_kg} kg · Muestra: ${r.cantidad_muestra} animales`)
              setShowLote(false)
            }}
            onCancel={() => setShowLote(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
