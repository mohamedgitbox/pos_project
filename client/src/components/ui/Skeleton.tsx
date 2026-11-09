export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-700 animate-pulse rounded ${className}`} />;
}
