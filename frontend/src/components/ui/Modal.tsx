/* ─── Modal Component ───
 * Centered, dimmed overlay, supports dismissible prop
 * If dismissible=false: no X button, no click-outside close, no Esc
 */

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  dismissible?: boolean;
  width?: number;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  dismissible = true,
  width = 480,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (dismissible && e.key === 'Escape') onClose();
    },
    [onClose, dismissible]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{ background: 'rgba(36, 48, 36, 0.4)' }}
        onClick={dismissible ? onClose : undefined}
      />

      {/* Modal panel */}
      <div
        className="fixed top-1/2 left-1/2 z-50 flex flex-col bg-white overflow-hidden rounded-2xl"
        style={{
          width: Math.min(width, '90vw' as unknown as number),
          maxHeight: '90vh',
          boxShadow: '0 8px 32px rgba(36, 48, 36, 0.15)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Header */}
        {(title || dismissible) && (
          <div
            className="flex items-center justify-between px-6 py-5 border-b shrink-0"
            style={{ borderColor: '#E8F5E8' }}
          >
            {title && (
              <h2 className="text-lg font-bold" style={{ color: '#243024' }}>
                {title}
              </h2>
            )}
            {dismissible && (
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-gray-100 ml-auto"
                style={{ color: '#5F6E5F' }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
