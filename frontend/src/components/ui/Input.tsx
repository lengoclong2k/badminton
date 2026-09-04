import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs font-medium text-sec">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-control border border-ctrl bg-soft px-3.5 text-sm text-ink placeholder:text-faint outline-none focus:border-mint focus:ring-2 focus:ring-mint-100",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
InputField.displayName = "InputField";
