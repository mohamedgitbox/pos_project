import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import api from "../lib/api";

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
    { label: "Today's Sales", value: dashboardData?.todaysSales ?? "$0.00", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Revenue (7 days)", value: dashboardData?.totalRevenue ?? "$0.00", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Low Stock Items", value: dashboardData?.lowStockCount ?? 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active Branches", value: dashboardData?.activeBranchesCount ?? 0, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Overview of sales and stock performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
                <div className={`p-2 rounded-full ${kpi.bg}`}>
                  <Icon size={20} className={kpi.color} />
                </div>
              </div>
              <p className="text-2xl font-bold">{typeof kpi.value === "number" ? kpi.value : money(kpi.value)}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales by Branch (Last 7 Days)</h2>
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
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]} />
                  <Bar dataKey="sales" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Branch</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dashboardData.salesByBranch.map((item) => (
                    <tr key={item.branchName}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.branchName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${money(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">No sales data for the last 7 days.</div>
        )}
      </div>
    </div>
  );
}
