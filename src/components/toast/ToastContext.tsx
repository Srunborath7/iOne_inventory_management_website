'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { UiIcon } from '@/components/uiIcon';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message, title };
      setToasts((prev) => [...prev.slice(-4), newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6"
      >
        {toasts.map((item) => {
          const isSuccess = item.type === 'success';
          const isError = item.type === 'error';

          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'border-emerald-500/20 bg-emerald-950/90 text-emerald-50 shadow-emerald-950/20'
                  : isError
                  ? 'border-rose-500/20 bg-rose-950/90 text-rose-50 shadow-rose-950/20'
                  : 'border-slate-700/30 bg-slate-900/90 text-slate-100 shadow-slate-950/30'
              }`}
              role="alert"
            >
              <div
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isError
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                <UiIcon
                  name={isSuccess ? 'check' : isError ? 'alert-triangle' : 'info'}
                  size={16}
                />
              </div>
              <div className="min-w-0 flex-1">
                {item.title && (
                  <p className="text-xs font-semibold tracking-tight text-white mb-0.5">
                    {item.title}
                  </p>
                )}
                <p className="text-xs font-medium leading-relaxed opacity-95">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss toast"
              >
                <UiIcon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
