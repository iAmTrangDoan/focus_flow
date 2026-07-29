import { useEffect, useState } from 'react';
import { CheckCircle2, X, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: number) => void;
}

const toastStyles: Record<ToastType, { border: string; bg: string; iconColor: string }> = {
  success: {
    border: '#DDF3DF',
    bg: '#DDF3DF',
    iconColor: '#5FAF6E',
  },
  error: {
    border: '#FEE2E2',
    bg: '#FEE2E2',
    iconColor: '#DC2626',
  },
  warning: {
    border: '#FEF3C7',
    bg: '#FEF3C7',
    iconColor: '#D97706',
  },
  info: {
    border: '#DBEAFE',
    bg: '#DBEAFE',
    iconColor: '#1D4ED8',
  },
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [toast.id, onRemove]);

  const styleConfig = toastStyles[toast.type] || toastStyles.info;

  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={16} style={{ color: styleConfig.iconColor }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: styleConfig.iconColor }} />;
      case 'error':
        return <AlertCircle size={16} style={{ color: styleConfig.iconColor }} />;
      case 'info':
      default:
        return <Info size={16} style={{ color: styleConfig.iconColor }} />;
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${styleConfig.border}`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        minWidth: 280,
        maxWidth: 380,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 32, height: 32, background: styleConfig.bg }}
      >
        {renderIcon()}
      </div>
      <p className="flex-1 text-sm font-medium" style={{ color: '#243024' }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-lg p-1 transition-colors hover:bg-gray-100"
        style={{ color: '#9CA3AF' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

let toastCounter = 0;
export function createToast(type: ToastType, message: string): ToastMessage {
  return { id: ++toastCounter, type, message };
}
