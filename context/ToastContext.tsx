import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconByVariant: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  warning: <TriangleAlert size={18} />,
  info: <Info size={18} />,
};

const styleByVariant: Record<ToastVariant, string> = {
  success:
    'border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-900/35 dark:text-emerald-100',
  error:
    'border-rose-200/70 bg-rose-50/90 text-rose-800 dark:border-rose-500/30 dark:bg-rose-900/35 dark:text-rose-100',
  warning:
    'border-amber-200/70 bg-amber-50/90 text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/35 dark:text-amber-100',
  info:
    'border-indigo-200/70 bg-indigo-50/90 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-900/35 dark:text-indigo-100',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const durationMs = toast.durationMs ?? 3200;
      const item: ToastItem = {
        id,
        title: toast.title,
        message: toast.message,
        variant: toast.variant ?? 'info',
        durationMs,
      };

      setToasts(prev => [...prev.slice(-3), item]);

      window.setTimeout(() => {
        removeToast(id);
      }, durationMs);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[220] flex flex-col gap-3 w-[min(92vw,360px)] pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border backdrop-blur-xl shadow-xl px-4 py-3 ${styleByVariant[toast.variant]} animate-fade-in-up`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 opacity-90">{iconByVariant[toast.variant]}</span>
              <div className="flex-1 min-w-0">
                {toast.title ? <p className="text-sm font-black leading-tight">{toast.title}</p> : null}
                <p className="text-sm font-semibold leading-snug break-words">{toast.message}</p>
              </div>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
                onClick={() => removeToast(toast.id)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }
  return context;
};

