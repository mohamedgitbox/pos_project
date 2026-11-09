import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Truck } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import StatusBadge, { statusVariant } from "../components/ui/StatusBadge";

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
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN or MANAGER can manage purchase orders.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Create, track, and receive supplier purchase orders."
        actions={
          <Link to="/purchase-orders/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            Create PO
          </Link>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["PO Number", "Supplier", "Branch", "Status", "Total Cost", "Date", "Actions"]}
        loading={loading}
        isEmpty={orders.length === 0}
        emptyIcon={Truck}
        emptyTitle="No purchase orders found"
        emptyMessage="Create your first purchase order to start stocking up."
        emptyAction={
          <Link to="/purchase-orders/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Create PO
          </Link>
        }
      >
        {orders.map((order) => (
          <tr key={order._id}>
            <td className="font-medium text-slate-900">{order.poNumber}</td>
            <td>{order.supplierName}</td>
            <td>{order.branch.name || "-"}</td>
            <td>
              <StatusBadge variant={statusVariant(order.status)}>{order.status}</StatusBadge>
            </td>
            <td className="text-slate-700">{money(order.totalCost)}</td>
            <td className="text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}</td>
            <td className="text-right">
              <Link to={`/purchase-orders/${order._id}`} className="text-sm font-medium text-blue-600 hover:underline">
                View
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}