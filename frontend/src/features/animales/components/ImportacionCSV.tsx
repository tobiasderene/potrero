import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Upload, CheckCircle, XCircle } from "lucide-react"
import { useImportarCSV, getApiError } from "../hooks/useAnimales"
import { useLotes, useCreateLote } from "@/features/lotes/hooks/useLotes"
import type { ErrorFila, ImportacionRead } from "@/types/api"

const CHUNK_SIZE = 200

interface Props {
  onClose: () => void
}

interface ProgresoChunk {
  actual: number
  total: number
  filasProcesadas: number
  filasTotal: number
}

type ModoLote = "ninguno" | "existente" | "nuevo"

const PROPOSITOS = [
  { value: "invernada", label: "Invernada" },
  { value: "cria", label: "Cría" },
  { value: "recria", label: "Recría" },
  { value: "reproduccion", label: "Reproducción" },
]

function csvAChunks(texto: string): { chunks: string[]; totalFilas: number } {
  const lineas = texto.split("\n")
  const header = lineas[0]
  const datos = lineas.slice(1).filter(l => l.trim() !== "")
  const chunks: string[] = []
  for (let i = 0; i < datos.length; i += CHUNK_SIZE) {
    chunks.push([header, ...datos.slice(i, i + CHUNK_SIZE)].join("\n"))
  }
  return { chunks, totalFilas: datos.length }
}

export function ImportacionCSV({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [resultado, setResultado] = useState<ImportacionRead | null>(null)
  const [progreso, setProgreso] = useState<ProgresoChunk | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const [modoLote, setModoLote] = useState<ModoLote>("ninguno")
  const [loteExistenteId, setLoteExistenteId] = useState("")
  const [nuevoLoteNombre, setNuevoLoteNombre] = useState("")
  const [nuevoLoteProposito, setNuevoLoteProposito] = useState("invernada")
  const [nuevoLoteFecha, setNuevoLoteFecha] = useState(() => new Date().toISOString().split("T")[0])
  const [loteAsignado, setLoteAsignado] = useState<string | undefined>(undefined)

  const importar = useImportarCSV()
  const crearLote = useCreateLote()
  const { data: lotesData } = useLotes("activo")

  const resolverLoteId = async (): Promise<{ loteId: string | undefined; ok: boolean }> => {
    if (modoLote === "ninguno") return { loteId: undefined, ok: true }

    if (modoLote === "existente") {
      if (!loteExistenteId) {
        setErrorGeneral("Seleccioná un lote o elegí 'Sin lote'")
        return { loteId: undefined, ok: false }
      }
      return { loteId: loteExistenteId, ok: true }
    }

    // nuevo
    if (!nuevoLoteNombre.trim()) {
      setErrorGeneral("El nombre del lote es obligatorio")
      return { loteId: undefined, ok: false }
    }
    try {
      const lote = await crearLote.mutateAsync({
        nombre: nuevoLoteNombre.trim(),
        proposito: nuevoLoteProposito,
        fecha_formacion: nuevoLoteFecha,
      })
      return { loteId: lote.id, ok: true }
    } catch (e) {
      setErrorGeneral(getApiError(e as Error))
      return { loteId: undefined, ok: false }
    }
  }

  const procesarArchivo = async (file: File) => {
    setErrorGeneral(null)
    setResultado(null)
    setLoteAsignado(undefined)

    const { loteId, ok } = await resolverLoteId()
    if (!ok) return

    const texto = await file.text()
    const { chunks, totalFilas } = csvAChunks(texto)

    if (chunks.length === 0) {
      setErrorGeneral("El archivo está vacío o no tiene datos.")
      return
    }

    if (chunks.length === 1) {
      try {
        const data = await importar.mutateAsync({ archivo: file, loteId })
        setLoteAsignado(loteId)
        setResultado(data)
      } catch (_e) {
        // error mostrado via importar.error
      }
      return
    }

    let filasProcesadas = 0
    let filasExitosas = 0
    let erroresAcumulados: ErrorFila[] = []

    for (let i = 0; i < chunks.length; i++) {
      setProgreso({
        actual: i + 1,
        total: chunks.length,
        filasProcesadas,
        filasTotal: totalFilas,
      })

      const chunkFile = new File(
        [chunks[i]],
        `${file.name}_parte${i + 1}.csv`,
        { type: "text/csv" }
      )

      try {
        const res = await importar.mutateAsync({ archivo: chunkFile, loteId })
        filasProcesadas += res.total_filas ?? 0
        filasExitosas += res.filas_exitosas ?? 0

        if (res.reporte_errores) {
          const offset = i * CHUNK_SIZE
          erroresAcumulados.push(
            ...res.reporte_errores.map(e => ({ ...e, fila: e.fila + offset }))
          )
        }
      } catch (e) {
        setErrorGeneral(getApiError(e as Error))
        setProgreso(null)
        return
      }
    }

    const estado = erroresAcumulados.length > 0
      ? (filasExitosas > 0 ? "completado_con_errores" : "fallido")
      : "completado"

    setProgreso(null)
    setLoteAsignado(loteId)
    setResultado({
      id: "combined",
      nombre_archivo: file.name,
      total_filas: totalFilas,
      filas_exitosas: filasExitosas,
      filas_con_error: erroresAcumulados.length,
      estado,
      reporte_errores: erroresAcumulados.length > 0 ? erroresAcumulados : null,
      created_at: new Date().toISOString(),
      completado_at: new Date().toISOString(),
    })
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await procesarArchivo(file)
    e.target.value = ""
  }

  const descargarPlantilla = () => {
    window.open(`${import.meta.env.VITE_API_URL ?? ""}/api/v1/importaciones/plantilla`, "_blank")
  }

  const descargarErrores = () => {
    if (!resultado?.reporte_errores) return
    const rows = resultado.reporte_errores.map(e =>
      `Fila ${e.fila}: ${e.errores.join("; ")}`
    ).join("\n")
    const blob = new Blob([rows], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "errores_importacion.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const loteAsignadoNombre = loteAsignado
    ? (lotesData?.items.find(l => l.id === loteAsignado)?.nombre ?? (nuevoLoteNombre || "lote"))
    : undefined

  // ── Vista: resultado ──────────────────────────────────────────────────────
  if (resultado) {
    const ok = resultado.estado === "completado"
    const parcial = resultado.estado === "completado_con_errores"
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {ok
            ? <CheckCircle className="h-6 w-6 text-green-600" />
            : <XCircle className="h-6 w-6 text-amber-500" />
          }
          <div>
            <p className="font-medium">
              {ok ? "Importación completada" : parcial ? "Importación completada con errores" : "Importación fallida"}
            </p>
            <p className="text-sm text-muted-foreground">
              {resultado.filas_exitosas} importados · {resultado.filas_con_error} con error · {resultado.total_filas} total
            </p>
            {loteAsignadoNombre && (
              <p className="text-sm text-muted-foreground">
                Asignados al lote: <span className="font-medium text-foreground">{loteAsignadoNombre}</span>
              </p>
            )}
          </div>
        </div>

        {resultado.reporte_errores && resultado.reporte_errores.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Errores por fila</p>
              <Button variant="outline" size="sm" onClick={descargarErrores}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Descargar errores
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded border text-sm divide-y">
              {resultado.reporte_errores.map((e, i) => (
                <div key={i} className="px-3 py-2">
                  <span className="font-medium text-muted-foreground mr-2">Fila {e.fila}</span>
                  {e.errores.join(" · ")}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Corregí las filas con error y volvé a subir solo esas filas como un CSV nuevo.
            </p>
            <Button variant="outline" onClick={() => inputRef.current?.click()} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Subir CSV corregido
            </Button>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    )
  }

  // ── Vista: progreso en chunks ─────────────────────────────────────────────
  if (progreso) {
    const pct = Math.round(((progreso.actual - 1) / progreso.total) * 100)
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Procesando lote {progreso.actual} de {progreso.total}</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground">
            {progreso.filasProcesadas} de {progreso.filasTotal} animales procesados — no cerrés esta ventana
          </p>
        </div>
      </div>
    )
  }

  // ── Vista: upload inicial ─────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Sección lote */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Lote <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(["ninguno", "existente", "nuevo"] as ModoLote[]).map((modo) => {
            const labels: Record<ModoLote, string> = {
              ninguno: "Sin lote",
              existente: "Lote existente",
              nuevo: "Lote nuevo",
            }
            return (
              <button
                key={modo}
                type="button"
                onClick={() => setModoLote(modo)}
                className={[
                  "flex-1 px-3 py-2 transition-colors",
                  modoLote === modo
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-background hover:bg-muted text-muted-foreground",
                  modo !== "ninguno" ? "border-l" : "",
                ].join(" ")}
              >
                {labels[modo]}
              </button>
            )
          })}
        </div>

        {modoLote === "existente" && (
          <Select value={loteExistenteId} onValueChange={setLoteExistenteId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un lote..." />
            </SelectTrigger>
            <SelectContent>
              {lotesData?.items.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nombre} <span className="text-muted-foreground capitalize ml-1">· {l.proposito}</span>
                </SelectItem>
              ))}
              {!lotesData?.items.length && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No hay lotes activos</div>
              )}
            </SelectContent>
          </Select>
        )}

        {modoLote === "nuevo" && (
          <div className="space-y-3 p-3 rounded-md border bg-muted/30">
            <div className="space-y-1.5">
              <Label htmlFor="lote-nombre" className="text-xs">Nombre del lote</Label>
              <Input
                id="lote-nombre"
                placeholder="Ej: Compra julio 2026"
                value={nuevoLoteNombre}
                onChange={e => setNuevoLoteNombre(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="lote-proposito" className="text-xs">Propósito</Label>
                <Select value={nuevoLoteProposito} onValueChange={setNuevoLoteProposito}>
                  <SelectTrigger id="lote-proposito">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSITOS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="lote-fecha" className="text-xs">Fecha de formación</Label>
                <Input
                  id="lote-fecha"
                  type="date"
                  value={nuevoLoteFecha}
                  onChange={e => setNuevoLoteFecha(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t" />

      {/* Sección archivo */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Descargá la plantilla, completá los datos y subí el CSV. Los errores se muestran fila por fila con mensajes descriptivos.
        </p>

        <Button variant="outline" onClick={descargarPlantilla} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Descargar plantilla CSV
        </Button>

        {importar.isPending || crearLote.isPending ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              {crearLote.isPending ? "Creando lote..." : "Procesando..."}
            </p>
            <Progress value={undefined} className="animate-pulse" />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Subir archivo CSV</p>
            <p className="text-xs text-muted-foreground">Hacé clic o arrastrá el archivo aquí</p>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {(errorGeneral || importar.error) && (
          <Alert variant="destructive">{errorGeneral ?? getApiError(importar.error!)}</Alert>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  )
}
