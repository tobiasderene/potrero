import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Download, Upload, CheckCircle, XCircle } from "lucide-react"
import { useImportarCSV, getApiError } from "../hooks/useAnimales"
import type { ErrorFila, ImportacionRead } from "@/types/api"

const CHUNK_SIZE = 200  // filas por lote; ~5-8s por lote en Cloud Run

interface Props {
  onClose: () => void
}

interface ProgresoChunk {
  actual: number
  total: number
  filasProcesadas: number
  filasTotal: number
}

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
  const importar = useImportarCSV()

  const procesarArchivo = async (file: File) => {
    setErrorGeneral(null)
    setResultado(null)

    const texto = await file.text()
    const { chunks, totalFilas } = csvAChunks(texto)

    if (chunks.length === 0) {
      setErrorGeneral("El archivo está vacío o no tiene datos.")
      return
    }

    // Archivo chico: subida directa sin progreso por chunks
    if (chunks.length === 1) {
      try {
        const data = await importar.mutateAsync(file)
        setResultado(data)
      } catch (e) {
        // error mostrado via importar.error
      }
      return
    }

    // Archivo grande: subir en chunks y mostrar progreso real
    let filasProcesadas = 0
    let filasExitosas = 0
    let erroresAcumulados: ErrorFila[] = []
    let estado = "completado"

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
        const res = await importar.mutateAsync(chunkFile)
        filasProcesadas += res.total_filas ?? 0
        filasExitosas += res.filas_exitosas ?? 0

        if (res.reporte_errores) {
          // Ajustar números de fila al contexto del archivo original
          // El backend reporta fila 2..N (fila 1 = header). El chunk i
          // empieza en la fila original 2 + i*CHUNK_SIZE.
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

    if (erroresAcumulados.length > 0) {
      estado = filasExitosas > 0 ? "completado_con_errores" : "fallido"
    }

    setProgreso(null)
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Descargá la plantilla, completá los datos y subí el CSV. Los errores se muestran fila por fila con mensajes descriptivos.
      </p>

      <Button variant="outline" onClick={descargarPlantilla} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Descargar plantilla CSV
      </Button>

      {importar.isPending && !progreso ? (
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground">Procesando...</p>
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

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  )
}
