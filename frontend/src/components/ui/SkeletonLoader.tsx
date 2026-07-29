interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-2xl bg-[#E8F5E8] ${className}`} />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm ${className}`}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      <Skeleton className="mb-3 h-8 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-[#E8F5E8] pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-5 ${i === 0 ? 'w-24' : 'flex-1'}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-8 ${i === 0 ? 'w-24' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-full items-end justify-around gap-2 p-4 ${className}`}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-xl bg-[#E8F5E8]"
          style={{ height: `${30 + ((i * 13) % 60)}%` }}
        />
      ))}
    </div>
  );
}

export interface SkeletonLoaderProps {
  variant: 'card' | 'table' | 'chart' | 'text';
  className?: string;
  rows?: number;
  cols?: number;
  lines?: number;
}

export function SkeletonLoader({ variant, className = '', rows, cols, lines }: SkeletonLoaderProps) {
  switch (variant) {
    case 'card':
      return <SkeletonCard className={className} />;
    case 'table':
      return <SkeletonTable rows={rows ?? 6} cols={cols ?? 5} />;
    case 'chart':
      return <SkeletonChart className={className} />;
    case 'text':
      return <SkeletonText lines={lines ?? 3} className={className} />;
    default:
      return null;
  }
}

export default SkeletonLoader;
