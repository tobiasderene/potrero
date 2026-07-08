import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Download, Upload, CheckCircle, XCircle } from "lucide-react"
import { useImportarCSV, getApiError } from "../hooks/useAnimales"
import type { ImportacionRead } from "@/types/api"

interface Props {
  onClose: () => void
}

export function ImportacionCSV({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [resultado, setResultado] = useState<ImportacionRead | null>(null)
  const importar = useImportarCSV()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importar.mutateAsync(file)
      setResultado(data)
    } catch {
      // error shown below
    }
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

  if (resultado) {
    const ok = resultado.estado === "completado"
    const parcial = resultado.estado === "completado_con_errores"

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {ok ? <CheckCircle className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-amber-500" />}
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Descargá la plantilla, completá los datos y subí el CSV. Los errores se muestran fila por fila con mensajes descriptivos.
      </p>

      <Button variant="outline" onClick={descargarPlantilla} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Descargar plantilla CSV
      </Button>

      {importar.isPending ? (
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

      {importar.error && (
        <Alert variant="destructive">{getApiError(importar.error)}</Alert>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  )
}
