import { useEffect, useState, useCallback } from "react";
import { X, ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";

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
    <div className="space-y-6">
      <PageHeader title="Sales" subtitle="Browse and inspect recorded sales." />

      {/* Filters card */}
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
          <div>
            <label className="block text-xs font-medium text-slate-500">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["Invoice #", "Branch", "Cashier", "Total", "Timestamp"]}
        loading={loading}
        isEmpty={sales.length === 0}
        emptyIcon={ReceiptText}
        emptyTitle="No sales found"
        emptyMessage="Try adjusting the filters or date range."
      >
        {sales.map((sale) => (
          <tr key={sale._id} onClick={() => void openDetail(sale._id)} className="cursor-pointer">
            <td className="font-medium text-slate-900">#{sale.invoiceNo}</td>
            <td>{sale.branch?.name ?? "Unknown"}</td>
            <td>{sale.user?.name ?? "Unknown"}</td>
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

      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {detail ? `Sale #${detail.invoiceNo}` : "Sale details"}
              </h2>
              <button onClick={closeDetail} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-8 animate-pulse rounded-md bg-slate-200" />
                ))}
              </div>
            ) : detailError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <span className="text-slate-500">Branch: </span>
                    <span className="font-medium text-slate-900">{detail.branch?.name ?? "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cashier: </span>
                    <span className="font-medium text-slate-900">{detail.user?.name ?? "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp: </span>
                    <span className="font-medium text-slate-900">{formatDate(detail.timestamp)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2.5 font-medium">Product</th>
                        <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                        <th className="px-4 py-2.5 text-right font-medium">Price</th>
                        <th className="px-4 py-2.5 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.items.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm text-slate-900">
                            {item.product ? `${item.product.name} (${item.product.SKU})` : "Deleted product"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-700">${money(item.price)}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">${money(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                        <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                          ${money(detail.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
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
