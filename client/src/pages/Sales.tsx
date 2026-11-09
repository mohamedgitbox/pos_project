import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import api from "../lib/api";

interface SaleRow {
  _id: string;
  invoiceNo: number;
  branch: { _id: string; name: string };
  user: { _id: string; name: string; email: string };
  totalAmount: string;
  timestamp: string;
}

interface SaleDetailItem {
  _id: string;
  product: { _id: string; name: string; SKU: string; barcode: string } | null;
  quantity: number;
  price: string;
  subtotal: string;
}

interface SaleDetail extends SaleRow {
  items: SaleDetailItem[];
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

export default function Sales() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (branchId) params.branchId = branchId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get("/sales", { params });
      setSales(res.data.data);
      setPagination(res.data.pagination ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, branchId, startDate, endDate]);

  useEffect(() => {
    api
      .get("/sales/branches")
      .then((res) => setBranches(res.data.data))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await api.get(`/sales/${id}`);
      setDetail(res.data.data);
    } catch (err) {
      setDetailError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError("");
  };

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Sales</h1>
        <p className="text-sm text-slate-400">Browse and inspect recorded sales.</p>
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
        <div>
          <label className="label block">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="input-well mt-1 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="label block">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="input-well mt-1 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-400">Loading sales...</div>
      ) : sales.length === 0 ? (
        <div className="card px-4 py-3 text-sm text-slate-400">No sales found.</div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cashier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-800">
              {sales.map((sale) => (
                <tr
                  key={sale._id}
                  onClick={() => void openDetail(sale._id)}
                  className="cursor-pointer hover:bg-slate-700/40 transition-colors border-l-2 border-l-transparent hover:border-l-amber-600"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-100">#{sale.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{sale.branch?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{sale.user?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-sm font-medium text-amber-500">${money(sale.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{formatDate(sale.timestamp)}</td>
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

      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-slate-800 border border-white/5 p-6 shadow-2xl fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-50">
                {detail ? `Sale #${detail.invoiceNo}` : "Sale details"}
              </h2>
              <button onClick={closeDetail} className="text-slate-400 hover:text-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            {detailLoading ? (
              <div className="text-sm text-slate-400">Loading sale...</div>
            ) : detailError ? (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{detailError}</div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Branch: </span>
                    <span className="font-medium text-slate-100">{detail.branch?.name ?? "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cashier: </span>
                    <span className="font-medium text-slate-100">{detail.user?.name ?? "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp: </span>
                    <span className="font-medium text-slate-100">{formatDate(detail.timestamp)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total: </span>
                    <span className="font-medium text-amber-500">${money(detail.totalAmount)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="min-w-full divide-y divide-slate-700/50">
                    <thead className="bg-slate-900/60">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                      {detail.items.map((item) => (
                        <tr key={item._id}>
                          <td className="px-4 py-2 text-sm text-slate-100">
                            {item.product ? `${item.product.name} (${item.product.SKU})` : "Deleted product"}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-300">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-slate-300">${money(item.price)}</td>
                          <td className="px-4 py-2 text-sm text-slate-100">${money(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
