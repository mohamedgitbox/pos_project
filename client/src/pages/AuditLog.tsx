import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { StatusBadge } from "../components/ui/StatusBadge";

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
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Audit Log</h1>
        <p className="text-sm text-slate-400">Read-only record of system actions.</p>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-400">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="card px-4 py-3 text-sm text-slate-400">No audit log entries found.</div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Entity Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Entity ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-800">
              {logs.map((log) => (
                <AuditLogRowView
                  key={log._id}
                  log={log}
                  expanded={expandedId === log._id}
                  onToggle={() => toggle(log._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
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
        className={hasDetail ? "cursor-pointer hover:bg-slate-700/40 transition-colors border-l-2 border-l-transparent hover:border-l-amber-600" : undefined}
        onClick={hasDetail ? onToggle : undefined}
      >
        <td className="px-4 py-3 text-sm text-slate-300">{formatDate(log.timestamp)}</td>
        <td className="px-4 py-3 text-sm font-medium text-slate-100">{log.user?.name ?? "Unknown"}</td>
        <td className="px-4 py-3 text-sm">
          <StatusBadge status={log.action} />
        </td>
        <td className="px-4 py-3 text-sm text-slate-300">{log.entityType}</td>
        <td className="px-4 py-3 text-sm font-mono text-slate-400">{log.entityId ?? "-"}</td>
        <td className="px-4 py-3 text-right text-sm text-slate-400">
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
          <td colSpan={6} className="bg-slate-900/40 px-4 py-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Before</h3>
                <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                  {log.before ? JSON.stringify(log.before, null, 2) : "—"}
                </pre>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">After</h3>
                <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
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
