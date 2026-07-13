import { cn } from "@/lib/utils"

// Anchos deterministas para evitar diferencias entre renders
const WIDTHS = [55, 70, 45, 65, 50, 75, 40, 60, 55, 68]

export function TableSkeleton({
  cols = 5,
  rows = 6,
  className,
}: {
  cols?: number
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri}>
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="px-4 py-3.5">
                  <div
                    className="h-3 rounded bg-muted/60 animate-pulse"
                    style={{ width: `${WIDTHS[(ri * cols + ci) % WIDTHS.length]}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
