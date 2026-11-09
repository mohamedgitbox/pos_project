import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";

interface Ref { id: string; name: string }
interface ProductRef extends Ref { SKU: string }
interface Item { _id: string; product: ProductRef; quantity: number }
interface Transfer { _id: string; transferNo: string; fromBranch: Ref; toBranch: Ref; initiatedBy: Ref; status: string; note: string; totalQuantity: number; shippedBy: Ref; shippedAt: string; receivedBy: Ref; receivedAt: string; cancelledBy: Ref; cancelledAt: string; createdAt: string; items: Item[] }
type Action = "SHIP" | "RECEIVE" | "CANCEL";

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const e = error as { response?: { data?: { error?: string } } };
    if (e.response?.data?.error) return e.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatDate(value: string): string {
  return value ? new Date(value).toLocaleString() : "-";
}

function actorLabel(date: string, actor: Ref): string {
  if (!date) return "-";
  return `${formatDate(date)}${actor.name ? ` by ${actor.name}` : ""}`;
}

export default function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const isAdmin = hasRole(["ADMIN"]);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/transfers/${id}`);
      setTransfer(res.data.data as Transfer);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (canManage && id) void load();
    else setLoading(false);
  }, [canManage, id]);

  const changeStatus = async (action: Action) => {
    if (!id) return;
    const message = action === "SHIP"
      ? "Ship this transfer? Source branch stock will be decremented."
      : action === "RECEIVE"
        ? "Receive this transfer? Destination branch stock will be incremented."
        : "Cancel this pending transfer?";
    if (!window.confirm(message)) return;

    setActing(true); setError("");
    try {
      await api.put(`/transfers/${id}/status`, { status: action });
      toast.success(action === "SHIP" ? "Transfer shipped successfully." : action === "RECEIVE" ? "Transfer received successfully." : "Transfer cancelled successfully.");
      await load();
    } catch (err) {
      const text = errorMessage(err);
      setError(text);
      toast.error(text);
    } finally { setActing(false); }
  };

  if (!canManage) return <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">Only ADMIN or MANAGER can view transfers.</div>;
  if (loading) return <div className="card p-10 text-center text-sm text-slate-400">Loading transfer...</div>;
  if (!transfer) {
    return (
      <div className="space-y-4 fade-up">
        <div className="card p-10 text-center text-sm text-slate-400">{error || "Transfer not found."}</div>
        <Link to="/transfers" className="inline-block text-sm font-medium text-amber-600 hover:text-amber-500 hover:underline">Back to transfers</Link>
      </div>
    );
  }

  const canActOnBranch = (branchId: string) => isAdmin || (!!user?.branchId && user.branchId === branchId);
  const canShip = transfer.status === "PENDING" && canActOnBranch(transfer.fromBranch.id);
  const canReceive = transfer.status === "IN_TRANSIT" && canActOnBranch(transfer.toBranch.id);
  const canCancel = transfer.status === "PENDING" && canActOnBranch(transfer.fromBranch.id);
  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">{transfer.transferNo}</h1>
          <p className="text-sm text-slate-400">Transfer detail and workflow actions.</p>
        </div>
        <Link to="/transfers" className="btn-secondary px-4 py-2 text-sm">
          Back to Transfers
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-50">Summary</h2>
              <StatusBadge status={transfer.status} size="md" />
            </div>

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="font-medium text-slate-400">From Branch</div>
                <div className="text-slate-100">{transfer.fromBranch.name || "-"}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">To Branch</div>
                <div className="text-slate-100">{transfer.toBranch.name || "-"}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Initiated By</div>
                <div className="text-slate-100">{transfer.initiatedBy.name || "-"}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Total Units</div>
                <div className="text-slate-100">{transfer.totalQuantity}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Created</div>
                <div className="text-slate-100">{formatDate(transfer.createdAt)}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Shipped</div>
                <div className="text-slate-100">{actorLabel(transfer.shippedAt, transfer.shippedBy)}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Received</div>
                <div className="text-slate-100">{actorLabel(transfer.receivedAt, transfer.receivedBy)}</div>
              </div>
              <div>
                <div className="font-medium text-slate-400">Cancelled</div>
                <div className="text-slate-100">{actorLabel(transfer.cancelledAt, transfer.cancelledBy)}</div>
              </div>
            </div>

            {transfer.note && (
              <div className="mt-4 rounded-lg bg-slate-900/40 border border-slate-700 p-3 text-sm text-slate-300">
                <div className="font-medium text-slate-400">Note</div>
                <div>{transfer.note}</div>
              </div>
            )}
          </div>

          <div className="overflow-hidden card">
            <div className="border-b border-slate-700 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-50">Items</h2>
            </div>
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                {transfer.items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-100">{item.product.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{item.product.SKU}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-300">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-50">Actions</h2>
          <div className="mt-4 space-y-3">
            {canShip && (
              <button
                type="button"
                onClick={() => void changeStatus("SHIP")}
                disabled={acting}
                className="btn-primary w-full px-4 py-2 text-sm"
              >
                Ship
              </button>
            )}

            {canReceive && (
              <button
                type="button"
                onClick={() => void changeStatus("RECEIVE")}
                disabled={acting}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors px-4 py-2 text-sm disabled:opacity-60"
              >
                Receive
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => void changeStatus("CANCEL")}
                disabled={acting}
                className="w-full rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60"
              >
                Cancel Transfer
              </button>
            )}

            {!canShip && !canReceive && !canCancel && (
              <p className="text-sm text-slate-400">No actions available for this status or your branch scope.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}