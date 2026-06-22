import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const config = {
    success: {
      bg: "bg-[#1A2636] border-[#22C55E]/40 text-slate-100",
      accent: "text-[#22C55E]",
      icon: CheckCircle
    },
    error: {
      bg: "bg-[#1A2636] border-[#EF4444]/40 text-slate-100",
      accent: "text-[#EF4444]",
      icon: XCircle
    },
    warning: {
      bg: "bg-[#1A2636] border-[#F59E0B]/40 text-slate-100",
      accent: "text-[#F59E0B]",
      icon: AlertTriangle
    },
    info: {
      bg: "bg-[#1A2636] border-[#00C4A7]/40 text-slate-100",
      accent: "text-[#00C4A7]",
      icon: Info
    }
  };

  const current = config[toast.type];
  const Icon = current.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-2xl transition-all duration-300 max-w-sm w-full font-sans border ${current.bg} border-l-4 border-l-${toast.type === 'success' ? '#22C55E' : toast.type === 'error' ? '#EF4444' : toast.type === 'warning' ? '#F59E0B' : '#00C4A7'}`}
      style={{
        borderLeftColor: toast.type === 'success' ? '#22C55E' : toast.type === 'error' ? '#EF4444' : toast.type === 'warning' ? '#F59E0B' : '#00C4A7'
      }}
    >
      <div className={`mt-0.5 shrink-0 ${current.accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{toast.title}</h4>
        <p className="text-xs text-slate-400 mt-1">{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full p-4 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onClose={onRemove} />
        </div>
      ))}
    </div>
  );
};
