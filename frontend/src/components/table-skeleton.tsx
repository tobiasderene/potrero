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
    <div className={cn("rounded-lg overflow-hidden bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.07),_0_1px_2px_-1px_rgb(0_0_0/0.05)]", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
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
