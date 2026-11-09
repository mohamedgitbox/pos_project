import { useEffect, useState } from "react";
import { ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";

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
      <PageHeader title="My Sales" subtitle="Sales you have recorded." />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["Invoice #", "Branch", "Total", "Timestamp"]}
        loading={loading}
        isEmpty={sales.length === 0}
        emptyIcon={ReceiptText}
        emptyTitle="No sales yet"
        emptyMessage="Sales you complete in the POS will appear here."
      >
        {sales.map((sale) => (
          <tr key={sale._id}>
            <td className="font-medium text-slate-900">#{sale.invoiceNo}</td>
            <td>{sale.branch?.name ?? "Unknown"}</td>
            <td className="font-medium text-slate-900">${money(sale.totalAmount)}</td>
            <td className="text-slate-500">{formatDate(sale.timestamp)}</td>
          </tr>
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
