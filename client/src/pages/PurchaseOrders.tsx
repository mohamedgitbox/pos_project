import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";

interface Branch {
  _id: string;
  name: string;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplierName: string;
  branch: Branch;
  status: string;
  totalCost: string;
  createdAt: string;
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

export default function PurchaseOrders() {
  const { hasRole } = useAuth();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/purchase-orders");
      setOrders(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canManage]);

  if (!canManage) {
    return <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">Only ADMIN or MANAGER can manage purchase orders.</div>;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-slate-400">Create, track, and receive supplier purchase orders.</p>
        </div>
        <Link to="/purchase-orders/new" className="btn-primary px-4 py-2 text-sm">
          Create PO
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="overflow-hidden card">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading purchase orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No purchase orders found.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total Cost</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-800">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-slate-700/40 transition-colors border-l-2 border-l-transparent hover:border-l-amber-600">
                  <td className="px-4 py-3 text-sm font-medium text-slate-100">{order.poNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{order.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{order.branch.name || "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-amber-500">${money(order.totalCost)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/purchase-orders/${order._id}`} className="text-sm font-medium text-amber-600 hover:text-amber-500 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}