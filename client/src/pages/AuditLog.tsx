import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, ClipboardList, ChevronLeft } from "lucide-react";
import api from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";

interface AuditLogRow {
  _id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  timestamp: string;
  user: { _id: string; name: string; email: string; role: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/audit-log", { params: { page, limit: 20 } });
      setLogs(res.data.data);
      setPagination(res.data.pagination ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="Read-only record of system actions." />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["Timestamp", "User", "Action", "Entity Type", "Entity ID", ""]}
        loading={loading}
        isEmpty={logs.length === 0}
        emptyIcon={ClipboardList}
        emptyTitle="No audit entries found"
        emptyMessage="System actions will be recorded here."
      >
        {logs.map((log) => (
          <AuditLogRowView
            key={log._id}
            log={log}
            expanded={expandedId === log._id}
            onToggle={() => toggle(log._id)}
          />
        ))}
      </DataTable>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page >= pagination.pages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogRowView({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLogRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail = Boolean(log.before || log.after);
  return (
    <>
      <tr
        className={hasDetail ? "cursor-pointer" : undefined}
        onClick={hasDetail ? onToggle : undefined}
      >
        <td className="text-slate-500">{formatDate(log.timestamp)}</td>
        <td className="font-medium text-slate-900">{log.user?.name ?? "Unknown"}</td>
        <td>
          <StatusBadge variant={log.action === "DELETE" ? "danger" : log.action === "CREATE" ? "success" : "neutral"}>
            {log.action}
          </StatusBadge>
        </td>
        <td>{log.entityType}</td>
        <td className="font-mono text-xs text-slate-400">{log.entityId ?? "-"}</td>
        <td className="text-right text-slate-400">
          {hasDetail ? (
            <span className="inline-flex items-center gap-1">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Detail
            </span>
          ) : null}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-slate-50 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Before</h3>
                <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-100">
                  {log.before ? JSON.stringify(log.before, null, 2) : "—"}
                </pre>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">After</h3>
                <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-100">
                  {log.after ? JSON.stringify(log.after, null, 2) : "—"}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
