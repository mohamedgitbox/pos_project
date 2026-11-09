import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import api from "../lib/api";
import { StatCard } from "../components/ui/StatCard";

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

  const kpis = [
    { label: "Today's Sales", value: dashboardData?.todaysSales ?? "$0.00", icon: DollarSign, color: "blue" },
    { label: "Revenue (7 days)", value: dashboardData?.totalRevenue ?? "$0.00", icon: TrendingUp, color: "emerald" },
    { label: "Low Stock Items", value: dashboardData?.lowStockCount ?? 0, icon: AlertTriangle, color: "amber" },
    { label: "Active Branches", value: dashboardData?.activeBranchesCount ?? 0, icon: Building2, color: "violet" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Reports</h1>
        <p className="text-sm text-slate-400">Overview of sales and stock performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={typeof kpi.value === "number" ? kpi.value : money(kpi.value)}
              icon={Icon}
              color={kpi.color}
              delay={`${idx * 100}ms`}
            />
          );
        })}
      </div>

      <div className="digital-frame fade-up delay-200">
        <div className="rounded-xl bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Sales by Branch (Last 7 Days)</h2>
          {dashboardData?.salesByBranch && dashboardData.salesByBranch.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboardData.salesByBranch.map((item) => ({
                      branch: item.branchName,
                      sales: parseFloat(item.total),
                    }))}
                  >
                    <XAxis dataKey="branch" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                      itemStyle={{ color: "#d97706" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]}
                    />
                    <Bar dataKey="sales" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700/50">
                  <thead className="bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Branch</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                    {dashboardData.salesByBranch.map((item) => (
                      <tr key={item.branchName} className="hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-2 text-sm text-slate-300">{item.branchName}</td>
                        <td className="px-4 py-2 text-sm font-medium text-amber-500">${money(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-slate-900/40 px-4 py-3 text-sm text-slate-400">No sales data for the last 7 days.</div>
          )}
        </div>
      </div>
    </div>
  );
}
