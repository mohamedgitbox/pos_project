import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Building2, BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import api from "../lib/api";
import StatCard from "../components/ui/StatCard";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";

interface DashboardData {
  todaysSales: string;
  totalRevenue: string;
  lowStockCount: number;
  activeBranchesCount: number;
  salesByBranch: Array<{ branchName: string; total: string }>;
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

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/reports/dashboard");
      setDashboardData(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <Skeleton className="mt-4 h-8 w-28" />
            </div>
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const kpis = [
    { label: "Today's Sales", value: `$${money(dashboardData?.todaysSales ?? "0")}`, icon: DollarSign, tone: "emerald" as const },
    { label: "Revenue (7 days)", value: `$${money(dashboardData?.totalRevenue ?? "0")}`, icon: TrendingUp, tone: "blue" as const },
    { label: "Low Stock Items", value: dashboardData?.lowStockCount ?? 0, icon: AlertTriangle, tone: "amber" as const },
    { label: "Active Branches", value: dashboardData?.activeBranchesCount ?? 0, icon: Building2, tone: "violet" as const },
  ];

  const chartData = (dashboardData?.salesByBranch ?? []).map((item) => ({
    branch: item.branchName,
    sales: parseFloat(item.total),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's happening across your stores today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} tone={kpi.tone} />
        ))}
      </div>

      {/* Sales chart */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">Sales by Branch</h2>
          </div>
          <span className="text-xs font-medium text-slate-400">Last 7 days</span>
        </div>
        {chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="branch" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]}
                  cursor={{ fill: "rgba(16, 185, 129, 0.06)" }}
                />
                <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            No sales data for the last 7 days.
          </div>
        )}
      </div>

      {/* Sales by branch — compact table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Branch performance</h2>
          <p className="text-sm text-slate-500">Total sales per branch over the last 7 days.</p>
        </div>
        {chartData.length > 0 ? (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3 font-medium">Branch</th>
                <th className="px-6 py-3 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboardData?.salesByBranch.map((item) => (
                <tr key={item.branchName} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.branchName}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-700">${money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-slate-500">No data available.</div>
        )}
      </div>
    </div>
  );
}
