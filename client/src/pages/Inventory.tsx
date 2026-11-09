import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";

interface InventoryRow {
  _id: string;
  product: {
    _id: string;
    name: string;
    SKU: string;
    barcode: string;
    costPrice: string;
    sellingPrice: string;
  };
  branch: { _id: string; name: string };
  quantity: number;
  minLevel: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface BranchOption {
  _id: string;
  name: string;
}

const LOW_STOCK_THRESHOLD = 10;

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

export default function Inventory() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (branchId) params.branchId = branchId;
      const res = await api.get("/inventory", { params });
      setRows(res.data.data);
      setPagination(res.data.pagination ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, branchId]);

  useEffect(() => {
    api
      .get("/branches")
      .then((res) => setBranches(res.data.data))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Inventory</h1>
        <p className="text-sm text-slate-400">Stock levels across branches (items under {LOW_STOCK_THRESHOLD} units are highlighted).</p>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label block">Branch</label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="input-well mt-1 px-3 py-2 text-sm"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch._id} value={branch._id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-400">Loading inventory...</div>
      ) : rows.length === 0 ? (
        <div className="card px-4 py-3 text-sm text-slate-400">No inventory records found.</div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-800">
              {rows.map((row) => (
                <tr key={row._id} className="group hover:bg-slate-700/40 transition-colors border-l-2 border-l-transparent hover:border-l-amber-600">
                  <td className="px-4 py-3 text-sm font-medium text-slate-100">{row.product?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{row.product?.SKU ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{row.branch?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">${money(row.product?.costPrice ?? "0")}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">${money(row.product?.sellingPrice ?? "0")}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${row.quantity < LOW_STOCK_THRESHOLD ? "text-red-400 bg-red-500/10" : "text-emerald-400"}`}>
                    {row.quantity}
                  </td>
                </tr>
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
