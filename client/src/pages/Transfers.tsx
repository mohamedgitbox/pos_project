import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

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

function statusClass(status: string): string {
  if (status === "RECEIVED") return "bg-green-100 text-green-800";
  if (status === "IN_TRANSIT") return "bg-blue-100 text-blue-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
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
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN or MANAGER can manage transfers.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
          <p className="text-sm text-gray-500">Move inventory between branches and track transfer status.</p>
        </div>
        <Link to="/transfers/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Create Transfer
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700" htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No transfers found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
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
            <tbody className="divide-y divide-gray-200 bg-white">
              {transfers.map((transfer) => (
                <tr key={transfer._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{transfer.transferNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{transfer.fromBranch.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{transfer.toBranch.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{transfer.totalQuantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(transfer.status)}`}>{transfer.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/transfers/${transfer._id}`} className="text-sm font-medium text-blue-600 hover:underline">
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