import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Building2, BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import api from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";

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

export default function Reports() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/reports/dashboard");
        if (cancelled) return;
        setDashboardData(res.data.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
              </div>
              <div className="mt-4 h-8 w-28 animate-pulse rounded bg-slate-200" />
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
      <PageHeader title="Reports" subtitle="Overview of sales and stock performance." />

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
          <>
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
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
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
            </div>
          </>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            No sales data for the last 7 days.
          </div>
        )}
      </div>
    </div>
  );
}
