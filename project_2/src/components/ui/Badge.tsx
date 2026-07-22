import { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  primary: {
    background: '#DDF3DF',
    color: '#5FAF6E',
  },
  secondary: {
    background: '#F4FAF4',
    color: '#5F6E5F',
  },
  success: {
    background: '#DDF3DF',
    color: '#4A9459',
  },
  warning: {
    background: '#FEF3C7',
    color: '#D97706',
  },
  danger: {
    background: '#FEE2E2',
    color: '#DC2626',
  },
  neutral: {
    background: '#F4FAF4',
    color: '#5F6E5F',
  },
};

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
