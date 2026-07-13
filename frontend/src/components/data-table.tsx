import type { ReactNode } from "react"
import { flexRender, type Table } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { TableSkeleton } from "./table-skeleton"
import { EmptyState } from "./empty-state"

interface DataTableProps<T> {
  table: Table<T>
  isLoading?: boolean
  onRowClick?: (row: T) => void
  /** Mostrado cuando no hay filas. Si se omite, muestra un EmptyState genérico. */
  emptyState?: ReactNode
  /** Columnas para el skeleton. Por defecto usa table.getAllColumns().length */
  skeletonCols?: number
  skeletonRows?: number
  className?: string
}

export function DataTable<T>({
  table,
  isLoading,
  onRowClick,
  emptyState,
  skeletonCols,
  skeletonRows = 6,
  className,
}: DataTableProps<T>) {
  const colCount = skeletonCols ?? table.getAllColumns().length

  if (isLoading) {
    return <TableSkeleton cols={colCount} rows={skeletonRows} className={className} />
  }

  const rows = table.getRowModel().rows

  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th
                  key={h.id}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                >
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colCount}>
                {emptyState ?? (
                  <EmptyState title="Sin resultados" description="No hay registros que coincidan." />
                )}
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  "transition-colors duration-150",
                  onRowClick && "cursor-pointer hover:bg-muted/40",
                )}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
