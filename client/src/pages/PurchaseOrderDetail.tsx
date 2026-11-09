import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";

interface Branch {
  _id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  SKU: string;
}

interface Item {
  _id: string;
  product: Product;
  orderedQty: number;
  unitCost: string;
  subtotal: string;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplierName: string;
  branch: Branch;
  status: string;
  totalCost: string;
  createdAt: string;
  items: Item[];
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function money(value: number | string): string {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? String(value) : parsed.toFixed(2);
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      setPo(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage && id) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canManage, id]);

  const changeStatus = async (status: "ORDERED" | "RECEIVED" | "CANCELLED") => {
    if (!id) return;
    setActing(true);
    setError("");
    try {
      await api.put(`/purchase-orders/${id}/status`, { status });
      toast.success(`Purchase order marked as ${status}.`);
      setConfirmReceive(false);
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setActing(false);
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        Only ADMIN or MANAGER can view purchase orders.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-10 text-center text-sm text-slate-400">
        Loading purchase order...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-4">
        <div className="card p-10 text-center text-sm text-slate-400">
          Purchase order not found.
        </div>
        <Link
          to="/purchase-orders"
          className="text-sm font-medium text-amber-600 hover:text-amber-500 hover:underline"
        >
          Back to purchase orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">{po.poNumber}</h1>
          <p className="text-sm text-slate-400">{po.supplierName}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={po.status} size="md" />
          <Link
            to="/purchase-orders"
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            Back
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="font-medium text-slate-400">Branch</div>
                <div className="text-slate-100">{po.branch.name || "-"}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Created At</div>
                <div className="text-slate-100">
                  {po.createdAt ? new Date(po.createdAt).toLocaleString() : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden card">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                {po.items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-100">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.product.SKU}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {item.orderedQty}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {money(item.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-amber-500">
                      {money(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/40 px-4 py-3 text-base font-bold text-slate-50">
              <span>Total Cost</span>
              <span>{money(po.totalCost)}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-50">Actions</h2>
          <div className="mt-4 space-y-3">
            {po.status === "DRAFT" && (
              <button
                type="button"
                onClick={() => void changeStatus("ORDERED")}
                disabled={acting}
                className="btn-primary w-full px-4 py-2 text-sm"
              >
                {acting ? "Processing..." : "Mark as Ordered"}
              </button>
            )}

            {po.status === "ORDERED" && (
              <button
                type="button"
                onClick={() => setConfirmReceive(true)}
                disabled={acting}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors px-4 py-2 text-sm disabled:opacity-60"
              >
                Receive
              </button>
            )}

            {(po.status === "RECEIVED" || po.status === "CANCELLED") && (
              <p className="text-sm text-slate-400">
                No actions available for this status.
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmReceive && po.status === "ORDERED" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-slate-800 border border-white/5 p-5 shadow-2xl fade-up">
            <h2 className="text-lg font-semibold text-slate-50">
              Receive Purchase Order?
            </h2>
            <p className="text-sm text-slate-400">
              This will increment inventory and update weighted-average cost.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReceive(false)}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void changeStatus("RECEIVED")}
                disabled={acting}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {acting ? "Processing..." : "Confirm Receive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
