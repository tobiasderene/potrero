import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        /* ── Genéricos shadcn (compatibilidad) ── */
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline:
          "border-border text-foreground",

        /* ── Semánticos Novillo ── */
        success:  "border-green-500/25  bg-green-500/10  text-green-700  dark:text-green-400",
        warning:  "border-amber-500/25  bg-amber-500/10  text-amber-700  dark:text-amber-400",
        danger:   "border-red-500/25    bg-red-500/10    text-red-700    dark:text-red-400",
        info:     "border-blue-500/25   bg-blue-500/10   text-blue-700   dark:text-blue-400",
        inactive: "border-border     bg-muted/40  text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
