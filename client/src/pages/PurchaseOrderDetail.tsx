import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

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

function statusClass(status: string): string {
  if (status === "RECEIVED") return "bg-green-100 text-green-800";
  if (status === "ORDERED") return "bg-blue-100 text-blue-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        Only ADMIN or MANAGER can view purchase orders.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
        Loading purchase order...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Purchase order not found.
        </div>
        <Link
          to="/purchase-orders"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to purchase orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
          <p className="text-sm text-gray-500">{po.supplierName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(po.status)}`}
          >
            {po.status}
          </span>
          <Link
            to="/purchase-orders"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="font-medium text-gray-500">Branch</div>
                <div className="text-gray-900">{po.branch.name || "-"}</div>
              </div>
              <div>
                <div className="font-medium text-gray-500">Created At</div>
                <div className="text-gray-900">
                  {po.createdAt ? new Date(po.createdAt).toLocaleString() : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {po.items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.product.SKU}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.orderedQty}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {money(item.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {money(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-base font-bold text-gray-900">
              <span>Total Cost</span>
              <span>{money(po.totalCost)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
          <div className="mt-4 space-y-3">
            {po.status === "DRAFT" && (
              <button
                type="button"
                onClick={() => void changeStatus("ORDERED")}
                disabled={acting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {acting ? "Processing..." : "Mark as Ordered"}
              </button>
            )}

            {po.status === "ORDERED" && (
              <button
                type="button"
                onClick={() => setConfirmReceive(true)}
                disabled={acting}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Receive
              </button>
            )}

            {(po.status === "RECEIVED" || po.status === "CANCELLED") && (
              <p className="text-sm text-gray-500">
                No actions available for this status.
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmReceive && po.status === "ORDERED" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Receive Purchase Order?
            </h2>
            <p className="text-sm text-gray-600">
              This will increment inventory and update weighted-average cost.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReceive(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void changeStatus("RECEIVED")}
                disabled={acting}
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-60"
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
