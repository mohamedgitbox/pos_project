import { useEffect, useState } from "react";
import api from "../lib/api";

interface MySaleRow {
  _id: string;
  invoiceNo: number;
  branch: { _id: string; name: string };
  totalAmount: string;
  timestamp: string;
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

function money(value: string): string {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? value : parsed.toFixed(2);
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function MySales() {
  const [sales, setSales] = useState<MySaleRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/sales/my-sales", { params: { page, limit: 20 } });
        if (cancelled) return;
        setSales(res.data.data);
        setPagination(res.data.pagination ?? null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Sales</h1>
        <p className="text-sm text-gray-500">Sales you have recorded.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading your sales...</div>
      ) : sales.length === 0 ? (
        <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">No sales found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{sale.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{sale.branch?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">${money(sale.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(sale.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page >= pagination.pages}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
