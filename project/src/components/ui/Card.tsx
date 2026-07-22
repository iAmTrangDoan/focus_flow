import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className = '', style, onClick }: CardProps) {
  return (
    <div
      className={`rounded-2xl transition-all ${className}`}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8F5E8',
        boxShadow: '0 2px 16px rgba(36, 48, 36, 0.07)',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b ${className}`} style={{ borderColor: '#E8F5E8' }}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
