import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "icon";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border border-border bg-transparent text-foreground hover:bg-secondary",
        variant === "ghost" && "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        variant === "icon" && "size-11 shrink-0 rounded-full bg-transparent p-0 text-foreground hover:bg-secondary",
        className,
      )}
      {...props}
    />
  );
}