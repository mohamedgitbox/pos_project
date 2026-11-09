import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import EmptyState from "./EmptyState";
import { TableSkeleton } from "./Skeleton";

interface DataTableProps {
  /** Column labels, rendered in thead. */
  headers: string[];
  /** When true, shows a subtle row skeleton instead of content. */
  loading?: boolean;
  /** When true, shows the empty state instead of content. */
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}

/**
 * Standard card-wrapped table: rounded-2xl white card, uppercase slate-400
 * column headers, divide-slate-100 rows with slate-50 hover and consistent
 * cell padding (px-6 py-4). Children must be <tr> elements.
 */
export default function DataTable({
  headers,
  loading = false,
  isEmpty = false,
  emptyIcon,
  emptyTitle = "Nothing here yet",
  emptyMessage,
  emptyAction,
  children,
}: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full [&_td]:px-6 [&_td]:py-4 [&_td]:text-sm [&_td]:text-slate-700 [&_tbody_tr:hover]:bg-slate-50">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
              {headers.map((header) => (
                <th key={header} className="px-6 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          {!loading && !isEmpty && <tbody className="divide-y divide-slate-100">{children}</tbody>}
        </table>
      </div>
      {loading && <TableSkeleton rows={5} />}
      {!loading && isEmpty && emptyIcon && (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
      )}
      {!loading && isEmpty && !emptyIcon && (
        <div className="px-6 py-14 text-center text-sm text-slate-500">{emptyTitle}</div>
      )}
    </div>
  );
}
