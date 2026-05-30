import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-rail-red/18 text-red-100 ring-1 ring-rail-red/35",
      success: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/25",
      warning: "bg-rail-amber/14 text-amber-100 ring-1 ring-rail-amber/30",
      muted: "bg-white/8 text-slate-300 ring-1 ring-white/10"
    }
  },
  defaultVariants: { variant: "default" }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
