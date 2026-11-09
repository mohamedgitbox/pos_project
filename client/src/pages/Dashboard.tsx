import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
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

  const kpis = [
    { label: "Today's Sales", value: dashboardData?.todaysSales || "$0.00", num: parseFloat(dashboardData?.todaysSales || "0") || 0, fmt: (n: number) => n.toFixed(2), icon: DollarSign, color: "blue" },
    { label: "Total Revenue (7 days)", value: dashboardData?.totalRevenue || "$0.00", num: parseFloat(dashboardData?.totalRevenue || "0") || 0, fmt: (n: number) => n.toFixed(2), icon: TrendingUp, color: "emerald" },
    { label: "Low Stock Items", value: dashboardData?.lowStockCount || 0, num: dashboardData?.lowStockCount || 0, fmt: (n: number) => String(Math.round(n)), icon: AlertTriangle, color: "amber" },
    { label: "Active Branches", value: dashboardData?.activeBranchesCount || 0, num: dashboardData?.activeBranchesCount || 0, fmt: (n: number) => String(Math.round(n)), icon: Building2, color: "violet" },
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
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-400">Here's what's happening with your POS today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={typeof kpi.value === "number" ? kpi.value : money(kpi.value)}
              numericValue={kpi.num}
              format={kpi.fmt}
              icon={Icon}
              color={kpi.color}
              delay={`${idx * 100}ms`}
            />
          );
        })}
      </div>

      {dashboardData?.salesByBranch && dashboardData.salesByBranch.length > 0 && (
        <div className="mt-8 fade-up delay-200">
          <div className="digital-frame fade-up delay-200">
            <div className="rounded-xl bg-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">Sales by Branch (Last 7 Days)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.salesByBranch.map((item) => ({
                    branch: item.branchName,
                    sales: parseFloat(item.total),
                  }))}>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
