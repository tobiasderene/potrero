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
        success:  "border-green-200  bg-green-50  text-green-700",
        warning:  "border-amber-200  bg-amber-50  text-amber-700",
        danger:   "border-red-200    bg-red-50    text-red-700",
        info:     "border-blue-200   bg-blue-50   text-blue-700",
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
