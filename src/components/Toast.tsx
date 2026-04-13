"use client";

import { useEffect, useState } from "react";
import { Check, X, AlertCircle, Loader2 } from "lucide-react";

export type ToastType = "success" | "error" | "loading";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  addToastFn?.(message, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (message: string, type: ToastType) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
      }
    };
    return () => { addToastFn = null; };
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-fade-in-up ${
            toast.type === "success"
              ? "bg-white border-green-200 text-navy"
              : toast.type === "error"
              ? "bg-white border-red-200 text-navy"
              : "bg-white border-gold/20 text-navy"
          }`}
        >
          {toast.type === "success" && <Check size={16} className="text-green-500 shrink-0" />}
          {toast.type === "error" && <AlertCircle size={16} className="text-red-500 shrink-0" />}
          {toast.type === "loading" && <Loader2 size={16} className="text-gold animate-spin shrink-0" />}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => dismiss(toast.id)} className="text-slate/40 hover:text-slate shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
