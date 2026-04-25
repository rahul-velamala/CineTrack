"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

type ToastVariant = "success" | "info" | "error";

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, opts?: { variant?: ToastVariant; duration?: number }) => void;
  success: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, opts?: { variant?: ToastVariant; duration?: number }) => {
      const id = ++toastCounter;
      const entry: ToastEntry = {
        id,
        message,
        variant: opts?.variant ?? "success",
        duration: opts?.duration ?? 2500,
      };
      setToasts((prev) => [...prev, entry]);
    },
    [],
  );

  const success = useCallback((message: string, duration?: number) => toast(message, { variant: "success", duration }), [toast]);
  const info = useCallback((message: string, duration?: number) => toast(message, { variant: "info", duration }), [toast]);
  const error = useCallback((message: string, duration?: number) => toast(message, { variant: "error", duration }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, info, error }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(entry.id), entry.duration);
    return () => clearTimeout(t);
  }, [entry, onDismiss]);

  const icon =
    entry.variant === "success" ? <CheckCircle2 className="w-4 h-4 text-cinema-green" /> :
    entry.variant === "error"   ? <AlertTriangle className="w-4 h-4 text-cinema-red" /> :
                                   <Info className="w-4 h-4 text-cinema-purple" />;

  const tint =
    entry.variant === "success" ? "border-cinema-green/40" :
    entry.variant === "error"   ? "border-cinema-red/40" :
                                   "border-cinema-purple/40";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`pointer-events-auto flex items-center gap-3 max-w-xs px-4 py-3 rounded-xl glass-strong border ${tint} shadow-2xl shadow-black/40`}
    >
      {icon}
      <p className="text-sm text-cinema-text flex-1 min-w-0">{entry.message}</p>
      <button
        onClick={() => onDismiss(entry.id)}
        aria-label="Dismiss"
        className="p-1 rounded text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: no-op when outside provider (server render etc)
    return {
      toast: () => {},
      success: () => {},
      info: () => {},
      error: () => {},
    };
  }
  return ctx;
}
