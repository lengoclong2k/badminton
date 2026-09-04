import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-mint text-mint-ink hover:bg-mint-hover active:bg-mint-active font-semibold",
  secondary:
    "bg-surface text-ink border border-border hover:bg-soft font-semibold",
  destructive:
    "bg-danger-50 text-danger-ink hover:bg-[#f6dedc] font-semibold",
  ghost: "bg-transparent text-sec hover:bg-soft font-medium",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-control",
  md: "h-11 px-5 text-sm rounded-control",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-control transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
