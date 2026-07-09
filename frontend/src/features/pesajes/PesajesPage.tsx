import { useState } from "react"
import { Scale, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PesajeIndividualForm } from "./components/PesajeIndividualForm"
import { PesajeLoteForm } from "./components/PesajeLoteForm"
import { GdpLoteCard } from "./components/GdpLoteCard"
import { useLotes } from "@/features/lotes/hooks/useLotes"
import { usePesajesLote, useAnularPesaje } from "./hooks/usePesajes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function PesajesPage() {
  const [showIndividual, setShowIndividual] = useState(false)
  const [showLote, setShowLote] = useState(false)
  const [animalIdBusqueda, setAnimalIdBusqueda] = useState("")
  const [loteGdpId, setLoteGdpId] = useState("")
  const [lastResult, setLastResult] = useState<string | null>(null)

  const { data: lotesData } = useLotes("activo")
  const lotes = lotesData?.items ?? []

  const { data: pesajesLote } = usePesajesLote(loteGdpId)
  const { mutate: anular, isPending: anulando } = useAnularPesaje()

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Pesajes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registre pesajes individuales o de lote y consulte la ganancia diaria de peso.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLote(true)}>
            Pesaje de lote
          </Button>
          <Button size="sm" onClick={() => setShowIndividual(true)}>
            Pesaje individual
          </Button>
        </div>
      </div>

      {lastResult && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {lastResult}
        </div>
      )}

      <Tabs defaultValue="gdp-lote">
        <TabsList>
          <TabsTrigger value="gdp-lote">GDP por Lote</TabsTrigger>
        </TabsList>

        <TabsContent value="gdp-lote" className="space-y-4 pt-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Seleccionar lote para ver GDP</Label>
            <Select value={loteGdpId} onValueChange={setLoteGdpId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar lote..." />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loteGdpId && (
            <GdpLoteCard loteId={loteGdpId} />
          )}

          {loteGdpId && pesajesLote && pesajesLote.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Historial de pesajes</p>
              <div className="rounded-md border divide-y text-sm">
                {pesajesLote.map((p) => (
                  <div key={p.evento_id} className="flex items-center justify-between px-3 py-2 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-muted-foreground w-24 shrink-0">{p.fecha_evento}</span>
                      <span className="font-medium tabular-nums">{Number(p.peso_kg).toFixed(1)} kg</span>
                      {p.cantidad_muestra != null && (
                        <span className="text-muted-foreground text-xs">muestra: {p.cantidad_muestra}</span>
                      )}
                      {p.gdp_g_dia != null && (
                        <Badge variant="secondary" className="text-xs">
                          {Number(p.gdp_g_dia).toFixed(0)} g/d
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      disabled={anulando}
                      onClick={() => {
                        if (confirm(`¿Anular pesaje del ${p.fecha_evento} (${Number(p.peso_kg).toFixed(1)} kg)?`)) {
                          anular({ eventoId: p.evento_id, loteId: loteGdpId })
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog pesaje individual */}
      <Dialog open={showIndividual} onOpenChange={setShowIndividual}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pesaje individual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ID del animal</Label>
              <Input
                placeholder="UUID del animal"
                value={animalIdBusqueda}
                onChange={(e) => setAnimalIdBusqueda(e.target.value)}
              />
            </div>
            {animalIdBusqueda && (
              <PesajeIndividualForm
                animalId={animalIdBusqueda}
                onSuccess={(r) => {
                  const gdp = r.gdp_g_dia ? `GDP: ${Number(r.gdp_g_dia).toFixed(0)} g/día` : "GDP: sin dato previo"
                  setLastResult(`Pesaje registrado · Peso: ${r.peso_kg} kg · ${gdp}`)
                  setShowIndividual(false)
                  setAnimalIdBusqueda("")
                }}
                onCancel={() => { setShowIndividual(false); setAnimalIdBusqueda("") }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pesaje de lote */}
      <Dialog open={showLote} onOpenChange={setShowLote}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pesaje de lote</DialogTitle>
          </DialogHeader>
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
