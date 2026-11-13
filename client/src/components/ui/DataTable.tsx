import { ReactNode } from "react";
import { TableSkeleton } from "./TableSkeleton";
import { EmptyState } from "./EmptyState";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

export interface DataTableProps<
  T extends { _id: string | number } = { _id: string | number }
> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { _id: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No items found.",
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`card fade-up ${className}`}>
        <TableSkeleton columns={columns.length} />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`card fade-up ${className}`}>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className={`card fade-up ${className}`}>
      <table className="tw-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4"
                style={{ minWidth: "120px" }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={String(item._id)}
              onClick={() => onRowClick?.(item)}
              className={`group ${onRowClick ? "cursor-pointer" : ""}`}
              style={{
                animation: `fadeUp 0.3s ease-out ${idx * 50}ms`,
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-6 py-4 align-middle text-sm text-ink"
                >
                  {col.render ? col.render(item) : String(item[col.key as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
