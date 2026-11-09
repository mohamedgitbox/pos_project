import { useEffect, useState, useCallback } from "react";
import { Boxes, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";

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
      <PageHeader
        title="Inventory"
        subtitle="Stock levels across branches."
      />

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500">Branch</label>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
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
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["Product", "SKU", "Branch", "Cost", "Price", "Quantity"]}
        loading={loading}
        isEmpty={rows.length === 0}
        emptyIcon={Boxes}
        emptyTitle="No inventory records found"
        emptyMessage="Stock will appear here once products are added to branches."
      >
        {rows.map((row) => (
          <tr key={row._id}>
            <td className="font-medium text-slate-900">{row.product?.name ?? "Unknown"}</td>
            <td>{row.product?.SKU ?? "-"}</td>
            <td>{row.branch?.name ?? "Unknown"}</td>
            <td>${money(row.product?.costPrice ?? "0")}</td>
            <td>${money(row.product?.sellingPrice ?? "0")}</td>
            <td>
              {row.quantity < LOW_STOCK_THRESHOLD ? (
                <div className="flex items-center gap-2">
                  <StatusBadge variant="danger">Low stock</StatusBadge>
                  <span className="text-sm font-medium text-slate-900">{row.quantity}</span>
                </div>
              ) : (
                <span className="font-medium text-slate-900">{row.quantity}</span>
              )}
            </td>
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
