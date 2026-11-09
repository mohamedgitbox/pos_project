import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import StatusBadge, { statusVariant } from "../components/ui/StatusBadge";

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
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN or MANAGER can manage transfers.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        subtitle="Move inventory between branches and track transfer status."
        actions={
          <Link to="/transfers/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            Create Transfer
          </Link>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Status filter card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        headers={["Transfer No", "From", "To", "Qty", "Status", "Created", "Actions"]}
        loading={loading}
        isEmpty={transfers.length === 0}
        emptyIcon={ArrowLeftRight}
        emptyTitle="No transfers found"
        emptyMessage="Create a transfer to move stock between branches."
        emptyAction={
          <Link to="/transfers/new" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Create Transfer
          </Link>
        }
      >
        {transfers.map((transfer) => (
          <tr key={transfer._id}>
            <td className="font-medium text-slate-900">{transfer.transferNo}</td>
            <td>{transfer.fromBranch.name || "-"}</td>
            <td>{transfer.toBranch.name || "-"}</td>
            <td>{transfer.totalQuantity}</td>
            <td>
              <StatusBadge variant={statusVariant(transfer.status)}>{transfer.status}</StatusBadge>
            </td>
            <td className="text-slate-500">
              {transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : "-"}
            </td>
            <td className="text-right">
              <Link to={`/transfers/${transfer._id}`} className="text-sm font-medium text-blue-600 hover:underline">
                View
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}