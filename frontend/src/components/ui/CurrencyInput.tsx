"use client";

import { ChangeEvent, InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/cn";

function toDigits(v: unknown) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/[^\d]/g, "");
}

function formatVnd(digits: string) {
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("vi-VN");
}

export interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "defaultValue"> {
  label: string;
  defaultValue?: number | string;
  value?: number | string;
  onValueChange?: (value: number) => void;
}

export function CurrencyInput({
  label,
  className,
  id,
  defaultValue,
  value,
  onValueChange,
  ...props
}: CurrencyInputProps) {
  const isControlled = value !== undefined;
  const [text, setText] = useState(() => formatVnd(toDigits(defaultValue)));
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const displayValue = isControlled ? formatVnd(toDigits(value)) : text;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = toDigits(e.target.value);
    if (!isControlled) setText(formatVnd(raw));
    onValueChange?.(raw ? parseInt(raw, 10) : 0);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-sec">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-control border border-ctrl bg-soft pl-3.5 pr-9 text-sm text-ink placeholder:text-faint outline-none focus:border-mint focus:ring-2 focus:ring-mint-100",
            className
          )}
          {...props}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-mut">
          ₫
        </span>
      </div>
    </div>
  );
}
