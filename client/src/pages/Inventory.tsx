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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">Stock levels across branches (items under {LOW_STOCK_THRESHOLD} units are highlighted).</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Branch</label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading inventory...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">No inventory records found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.product?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.product?.SKU ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.branch?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">${money(row.product?.costPrice ?? "0")}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">${money(row.product?.sellingPrice ?? "0")}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${row.quantity < LOW_STOCK_THRESHOLD ? "text-red-600" : "text-gray-900"}`}>
                    {row.quantity}
                  </td>
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
