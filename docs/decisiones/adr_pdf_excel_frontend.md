# ADR: Generación de PDF y Excel en el frontend

**Fecha**: 2026-07-09  
**Estado**: Aprobado  
**Contexto**: Sprint 5 — reportes exportables

---

## Decisión

PDF y Excel se generan **en el browser**, no en el servidor.

## Rationale

Esta decisión es coherente con la ya tomada en Sprint 3 para la guía de traslado SENACSA:
> "No PDF server-side: la guía de traslado se genera como datos JSON vía GET /movimientos/{id}. El frontend puede imprimirla con CSS print. Se evitó agregar reportlab al stack."

**Por qué no server-side:**
- `reportlab` agrega ~2 MB de dependencia al backend y requiere gestionar fuentes, layouts y paginación en Python
- Los resultados son mediocres comparados con CSS + browser rendering
- Aumenta el tiempo de cold-start en Cloud Run
- Testing se vuelve binario (¿el PDF se renderizó bien?) vs estructural (¿los datos son correctos?)

## Implementación

### PDF
`window.print()` sobre la tabla de preview con estilos `@media print`. El browser genera el PDF con el renderizado nativo del sistema operativo (el mejor calidad disponible).

```css
@media print {
  .print\:hidden { display: none; }
  .print\:overflow-visible { overflow: visible; }
}
```

### Excel
[SheetJS (xlsx)](https://sheetjs.com/) — `npm install xlsx`.  
Se genera en el browser a partir del JSON del backend. Ventajas:
- Zero latencia de red (no round-trip)
- El usuario ve la preview antes de descargar
- Soporte nativo para múltiples hojas, estilos de columna, etc.

### Flujo UX
1. Usuario elige tipo de reporte
2. El frontend llama al backend (`GET /api/v1/reportes/inventario` o `/movimientos`)
3. Se muestra una preview en un Dialog con resumen y primeras 50 filas
4. Botón "Descargar Excel" → SheetJS genera el `.xlsx` localmente
5. Botón "Imprimir / PDF" → `window.print()` sobre la vista de preview

## Límites conocidos

- **Inventarios grandes (> 10.000 animales)**: el JSON completo viaja en la respuesta HTTP. Para este MVP no es un problema (estancias paraguayas típicas < 5.000 cabezas). Si escala, se puede agregar paginación en el endpoint o generación server-side lazy.
- **Print CSS**: el formato impreso depende del browser y configuración del usuario (márgenes, escala). No es 100% reproducible entre usuarios — es acceptable para un borrador, no para un documento oficial.
- **Documentos oficiales SENACSA**: la guía de traslado requiere un formato específico. Para V2 se puede agregar una plantilla HTML con CSS de impresión dedicado que replique el formulario oficial.

## Lo que NO se hizo (y por qué)

- **`reportlab`**: descartado — ver arriba.
- **`openpyxl` server-side**: descartado — la generación en cliente es más simple y no requiere memoria del servidor para bufferear el archivo.
- **WeasyPrint / pdfkit**: requieren binarios del sistema operativo en el container — incompatible con el objetivo de imagen mínima en Cloud Run.
