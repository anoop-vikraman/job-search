import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        success: "border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
        danger: "border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
        pending: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        neutral: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps): React.JSX.Element {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
