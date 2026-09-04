"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ToastItem {
  id: number;
  message: string;
  onUndo?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, onUndo?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, onUndo?: () => void) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, message, onUndo }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 10000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 rounded-control bg-ink px-4 py-3 text-sm text-white shadow-lg"
              >
                <span>{t.message}</span>
                {t.onUndo && (
                  <button
                    className="font-semibold text-mint-300 hover:text-mint-100"
                    onClick={() => {
                      t.onUndo?.();
                      setToasts((ts) => ts.filter((x) => x.id !== t.id));
                    }}
                  >
                    Hoàn tác
                  </button>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
