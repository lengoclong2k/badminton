"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function DropdownMenu({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="rounded-control p-1.5 hover:bg-soft">
        {trigger}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 min-w-[180px] rounded-control border border-border bg-surface py-1.5 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full px-3.5 py-2 text-left text-sm hover:bg-soft",
        danger ? "text-danger-text" : "text-ink"
      )}
    >
      {children}
    </button>
  );
}
