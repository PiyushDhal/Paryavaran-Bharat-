import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default: "bg-brand-amber text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.25)] hover:bg-amber-400 hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)]",
        secondary: "bg-surface border border-brand-steel text-white hover:bg-surface-elevated shadow-sm",
        outline: "border border-[rgba(255,255,255,0.06)] bg-transparent text-foreground hover:bg-surface hover:text-white",
        ghost: "text-muted-foreground hover:bg-surface hover:text-brand-amber",
        destructive: "bg-destructive text-destructive-foreground hover:bg-red-400 shadow-sm"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
