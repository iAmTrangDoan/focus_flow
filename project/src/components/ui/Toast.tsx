export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

const typeStyles: Record<ToastType, { bg: string; color: string }> = {
  success: { bg: '#DDF3DF', color: '#4A9459' },
  warning: { bg: '#FEF3C7', color: '#D97706' },
  error: { bg: '#FEE2E2', color: '#DC2626' },
  info: { bg: '#E0F2FE', color: '#0369A1' },
};

let toastCounter = 0;

export function createToast(type: ToastType, message: string): ToastMessage {
  return {
    id: `toast-${++toastCounter}`,
    type,
    message,
  };
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => {
        const styles = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in"
            style={{
              background: styles.bg,
              color: styles.color,
              minWidth: 280,
            }}
          >
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="p-1 rounded hover:opacity-70"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
