import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";

interface BranchRef {
  id: string;
  name: string;
}

interface Transfer {
  _id: string;
  transferNo: string;
  fromBranch: BranchRef;
  toBranch: BranchRef;
  status: string;
  totalQuantity: number;
  createdAt: string;
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function Transfers() {
  const { hasRole } = useAuth();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/transfers", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setTransfers(res.data.data);
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
  }, [canManage, statusFilter]);

  if (!canManage) {
    return <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">Only ADMIN or MANAGER can manage transfers.</div>;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-slate-400">Move inventory between branches and track transfer status.</p>
        </div>
        <Link to="/transfers/new" className="btn-primary px-4 py-2 text-sm">
          Create Transfer
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-300" htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="input-well px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="overflow-hidden card">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No transfers found.</div>
        ) : (
          <table className="tw-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Transfer No</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer._id}>
                  <td className="px-4 py-3 text-sm font-medium text-ink">{transfer.transferNo}</td>
                  <td className="px-4 py-3 text-sm text-ink">{transfer.fromBranch.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-ink">{transfer.toBranch.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-ink">{transfer.totalQuantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={transfer.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">
                    {transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/transfers/${transfer._id}`} className="text-sm font-medium text-amber-600 hover:text-amber-500 hover:underline">
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