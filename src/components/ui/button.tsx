import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        icon: "shrink-0 rounded-full bg-transparent text-foreground hover:bg-secondary",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 min-h-9 px-3",
        lg: "h-12 px-6",
        icon: "size-11 min-h-11 p-0",
        "icon-sm": "size-9 min-h-9 p-0",
        "icon-lg": "size-12 min-h-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";