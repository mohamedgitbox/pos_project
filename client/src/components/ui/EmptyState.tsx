import { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-slate-700/50">
        <AlertCircle size={22} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
