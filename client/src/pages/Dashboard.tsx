import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, AlertTriangle, Building2, BarChart3, Calendar, RefreshCw, Download } from "lucide-react";
import { motion } from "motion/react";
import { Area, AreaChart, Bar, BarChart as RehartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
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

interface DailySales {
  date: string;
  sales: number;
  count: number;
}

interface BranchOption {
  _id: string;
  name: string;
}

interface SaleRow {
  _id: string;
  invoiceNo: string;
  branch: { _id: string; name: string } | null;
  user: { _id: string; name: string; email: string } | null;
  totalAmount: string;
  timestamp: string;
}

interface LowStockItem {
  _id: string;
  product: { _id: string; name: string; SKU: string; barcode: string } | null;
  quantity: number;
  minLevel: number;
  branch: { _id: string; name: string } | null;
}

// Tillwave dashboard theme colors
const dashboardTheme = {
  navy950: '#071629',
  navy800: '#102a43',
  navy700: '#173857',
  navy600: '#21496d',
  accent: '#d97706',
  'accent-bright': '#f59e0b',
  'ink-soft': '#dcecf5',
  'ink-muted': '#8196ab',
  success: '#34e0a1',
  warning: '#ffc75f',
  danger: '#ff6b7f',
  emerald: '#34e0a1',
};

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function money(value: string | number): string {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(parsed) ? String(value) : parsed.toFixed(2);
}

type DateRangeFilter = 'today' | '7d' | '30d';

// Branch scope: admin's explicit branch selection, otherwise the user's own branch.
function getBranchScope(isAdmin: boolean, selectedBranchId: string | null, userBranchId: string | null) {
  return (isAdmin && selectedBranchId) || userBranchId || null;
}

// Format a timestamp as relative time (e.g. "2h ago", "Yesterday").
function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(["ADMIN"]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [recentSales, setRecentSales] = useState<SaleRow[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>('7d');
  // Section-level states for the new operational blocks
  const [recentSalesLoading, setRecentSalesLoading] = useState(false);
  const [recentSalesError, setRecentSalesError] = useState("");
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState("");

  const branchScope = getBranchScope(isAdmin, selectedBranchId, user?.branchId || null);

  // Column colors for 3D-style bar chart
  const branchColors = ['#d97706', '#34e0a1', '#0ea5e9', '#a855f7', '#f97316', '#8b5cf6', '#14b8a6'];

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { dateRange };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await api.get("/reports/dashboard", { params });
      setDashboardData(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadDailySales = async () => {
    try {
      const params: Record<string, string> = { dateRange };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await api.get("/reports/daily-sales", { params });
      setDailySales(res.data.data);
    } catch (err) {
      // Silent fail - daily sales is supplementary to the KPIs
    }
  };

  const loadRecentSales = async () => {
    setRecentSalesLoading(true);
    setRecentSalesError("");
    try {
      const params: Record<string, string> = { page: "1", limit: "8" };
      if (branchScope) params.branchId = branchScope;
      const res = await api.get("/sales", { params });
      setRecentSales(res.data.data as SaleRow[] || []);
    } catch (err) {
      setRecentSalesError(errorMessage(err));
      setRecentSales([]);
    } finally {
      setRecentSalesLoading(false);
    }
  };

  const loadLowStock = async () => {
    setLowStockLoading(true);
    setLowStockError("");
    try {
      const params: Record<string, string> = { page: "1", limit: "8", lowStock: "true" };
      if (branchScope) params.branchId = branchScope;
      const res = await api.get("/inventory", { params });
      setLowStockItems((res.data.data as LowStockItem[]) || []);
    } catch (err) {
      setLowStockError(errorMessage(err));
      setLowStockItems([]);
    } finally {
      setLowStockLoading(false);
    }
  };

  // Load branches for the ADMIN branch filter
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    api.get("/branches")
      .then((res) => {
        if (!cancelled) setBranches(res.data.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    loadDashboardData();
    loadDailySales();
    loadRecentSales();
    loadLowStock();
  }, [dateRange, selectedBranchId]);

  const revenueRangeLabel = dateRange === "today" ? "Today" : dateRange === "7d" ? "7 Days" : "30 Days";
  const kpis = useMemo(() => [
    { label: "Today's Sales", value: dashboardData?.todaysSales || "$0.00", num: parseFloat(dashboardData?.todaysSales || "0") || 0, fmt: (n: number) => `$${n.toFixed(2)}`, icon: DollarSign, color: "emerald" as const },
    { label: `Revenue (${revenueRangeLabel})`, value: dashboardData?.totalRevenue || "$0.00", num: parseFloat(dashboardData?.totalRevenue || "0") || 0, fmt: (n: number) => `$${n.toFixed(2)}`, icon: TrendingUp, color: "blue" as const },
    { label: "Low Stock Items", value: dashboardData?.lowStockCount || 0, num: dashboardData?.lowStockCount || 0, fmt: (n: number) => String(Math.round(n)), icon: AlertTriangle, color: "amber" as const },
    { label: "Active Branches", value: dashboardData?.activeBranchesCount || 0, num: dashboardData?.activeBranchesCount || 0, fmt: (n: number) => String(Math.round(n)), icon: Building2, color: "violet" as const },
  ], [dashboardData, revenueRangeLabel]);

  // Consolidated sales trend: current window series from /reports/daily-sales
  const trendChartData = useMemo(() => {
    return dailySales.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: d.sales,
    }));
  }, [dailySales]);

  // Prepare 3D-style bar chart data (sales by branch over the same window)
  const branchChartData = useMemo(() => {
    return (dashboardData?.salesByBranch || []).map((item, idx) => ({
      ...item,
      sales: parseFloat(item.total),
      fill: branchColors[idx % branchColors.length],
    }));
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-navy-700/30" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 bg-navy-800/60 animate-pulse">
              <div className="h-4 w-24 bg-navy-700/30 rounded mb-3" />
              <div className="h-8 w-16 bg-navy-700/30 rounded" />
            </div>
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-navy-800/60 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border p-6 text-danger"
           style={{ backgroundColor: `${dashboardTheme.danger}10`, borderColor: `${dashboardTheme.danger}20` }}>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={20} style={{ color: dashboardTheme.danger }} />
          <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
        </div>
        <p className="mb-4" style={{ color: dashboardTheme['ink-soft'] }}>{error}</p>
        <button
          onClick={() => { loadDashboardData(); loadDailySales(); loadRecentSales(); loadLowStock(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200"
          style={{
            background: `linear-gradient(110deg, ${dashboardTheme.accent} 0%, ${dashboardTheme['accent-bright']} 100%)`,
            color: dashboardTheme.navy950,
          }}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
      style={{
        background: `linear-gradient(135deg, ${dashboardTheme.navy950} 0%, ${dashboardTheme.navy800} 25%, ${dashboardTheme.navy950} 100%)`,
        minHeight: '100vh',
      }}
    >
      {/* Header with filters */}
      <div className="relative isolate rounded-2xl p-6 md:p-8"
           style={{
             background: `linear-gradient(180deg, ${dashboardTheme.navy800} 0%, ${dashboardTheme.navy700} 100%)`,
             border: '1px solid rgba(255, 255, 255, 0.05)',
           }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[linear-gradient(135deg,_transparent_40%,_rgba(255,255,255,0.03)_50%)]" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: `${dashboardTheme['ink-soft']}75` }}>
              Here's what's happening with your POS today.
            </p>
          </div>

          {/* Date Range Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select
                value={selectedBranchId || ""}
                onChange={(e) => setSelectedBranchId(e.target.value || null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: dashboardTheme.navy800,
                  color: dashboardTheme['ink-soft'],
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { loadDashboardData(); loadDailySales(); loadRecentSales(); loadLowStock(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: dashboardTheme['ink-soft'] }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => {
                const branchName = branches.find((b) => b._id === selectedBranchId)?.name || "all";
                const safeName = String(branchName).replace(/[^a-z0-9]/gi, "_");
                const csv =
                  "Date,Sales,Orders\n" +
                  dailySales.map((d) => `${d.date},${d.sales},${d.count}`).join("\n");
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `daily-sales-${dateRange}-${safeName}.csv`;
                a.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10"
              style={{ color: dashboardTheme['ink-soft'] }}
            >
              <Download size={14} />
              Export
            </button>
            {(['today', '7d', '30d'] as DateRangeFilter[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: dateRange === range ? `${dashboardTheme.accent}20` : 'rgba(255,255,255,0.05)',
                  color: dateRange === range ? dashboardTheme.accent : dashboardTheme['ink-soft'],
                }}
              >
                <Calendar size={14} />
                {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <StatCard
                label={kpi.label}
                value={typeof kpi.value === "number" ? kpi.value : money(kpi.value)}
                numericValue={kpi.num}
                format={kpi.fmt}
                icon={Icon}
                color={kpi.color}
                delay={`${idx * 100}ms`}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Block 1 — Sales Trend (consolidated, full width). Driven by /api/reports/daily-sales,
          reacts to date-range and branch filter. Period-over-period comparison would require a
          server change (the /daily-sales endpoint accepts only dateRange + branchId), so it is
          intentionally omitted per instructions. */}
      {trendChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${dashboardTheme.navy800} 0%, ${dashboardTheme.navy700} 100%)`,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[linear-gradient(135deg,_transparent_40%,_rgba(255,255,255,0.03)_50%)]" />
          </div>
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: dashboardTheme['ink-soft'] }} />
                <h2 className="text-lg font-semibold text-ink">Sales Trend</h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5" style={{ color: dashboardTheme['ink-soft'] }}>
                  <span className="inline-block w-3 h-1.5 rounded" style={{ background: dashboardTheme.accent }}></span>
                  <span>Revenue — {revenueRangeLabel}</span>
                </div>
                <span className="text-ink-muted">per day</span>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={dashboardTheme.accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={dashboardTheme.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={dashboardTheme['ink-muted']}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: dashboardTheme['ink-muted'] }}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke={dashboardTheme['ink-muted']}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: dashboardTheme['ink-muted'] }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    cursor={{ stroke: dashboardTheme.navy600, strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: dashboardTheme.navy950,
                      borderColor: dashboardTheme.navy700,
                      borderRadius: "8px",
                      color: dashboardTheme['ink-soft'],
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    }}
                    itemStyle={{ color: dashboardTheme.accent }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    labelFormatter={(label) => [label, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke={dashboardTheme.accent}
                    strokeWidth={2.5}
                    fill="url(#gradient-sales)"
                    dot={{ r: 4, fill: dashboardTheme.accent, stroke: dashboardTheme.navy800, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: dashboardTheme.accent, stroke: dashboardTheme.navy800, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sales by Branch (3D-styled columns) + Branch Performance table */}
      {branchChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${dashboardTheme.navy800} 0%, ${dashboardTheme.navy700} 100%)`,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[linear-gradient(135deg,_transparent_40%,_rgba(255,255,255,0.03)_50%)]" />
          </div>
          <div className="relative z-10">
            <div className="border-b border-white/5 px-6 py-4"
                 style={{ background: `${dashboardTheme.navy700}40` }}>
              <h2 className="font-semibold text-white">Sales by Branch</h2>
              <p className="text-xs mt-1" style={{ color: dashboardTheme['ink-muted'] }}>
                Sales per branch over the selected period
              </p>
            </div>
            <div className="relative p-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RehartsBarChart data={branchChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="branchName"
                      stroke={dashboardTheme['ink-muted']}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: dashboardTheme['ink-muted'] }}
                    />
                    <YAxis
                      stroke={dashboardTheme['ink-muted']}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: dashboardTheme['ink-muted'] }}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: dashboardTheme.navy950,
                        borderColor: dashboardTheme.navy700,
                        borderRadius: "8px",
                        color: dashboardTheme['ink-soft'],
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                      }}
                      itemStyle={{ color: dashboardTheme.accent }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]}
                    />
                    <Bar
                      dataKey="sales"
                      radius={[8, 8, 0, 0]}
                      stroke={dashboardTheme.navy700}
                      strokeWidth={1}
                    >
                      {branchChartData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.fill}
                          style={{
                            filter: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))',
                          }}
                        />
                      ))}
                    </Bar>
                  </RehartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="relative px-6 pb-6">
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: dashboardTheme['ink-muted'] }}>
                Branch Performance
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-white/5">
                    <tr className="text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: dashboardTheme['ink-muted'] }}>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {branchChartData.map((item) => (
                      <tr key={item.branchName} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-ink">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                            {item.branchName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-ink">
                          ${money(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Block 2 — Operational Snapshot: recent sales + low stock alerts */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">

        {/* Recent Sales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${dashboardTheme.navy800} 0%, ${dashboardTheme.navy700} 100%)`,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[linear-gradient(135deg,_transparent_40%,_rgba(255,255,255,0.03)_50%)]" />
          </div>
          <div className="relative z-10">
            <div className="border-b border-white/5 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">Recent Sales</h3>
                <span className="text-xs text-ink-muted">{recentSales.length} / 8</span>
              </div>
            </div>
            {recentSalesLoading ? (
              <div className="px-6 py-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-16 bg-navy-700/30 rounded animate-pulse" />
                    <div className="flex-1 h-4 bg-navy-700/30 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentSalesError ? (
              <div className="px-6 py-6 text-center">
                <p className="text-sm text-ink-muted mb-3">{recentSalesError}</p>
                <button
                  onClick={loadRecentSales}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5"
                  style={{ color: dashboardTheme.accent }}
                >
                  Retry
                </button>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-ink-muted">No sales yet for this period.</p>
              </div>
            ) : (
              <div className="px-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium uppercase tracking-wide"
                          style={{ color: dashboardTheme['ink-muted'] }}>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Cashier</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentSales.map((sale) => (
                        <tr key={sale._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 text-ink font-medium">{sale.invoiceNo}</td>
                          <td className="px-4 py-2.5 text-ink-muted">{sale.user?.name ?? "-"}</td>
                          <td className="px-4 py-2.5 text-right text-ink">{money(sale.totalAmount)}</td>
                          <td className="px-4 py-2.5 text-right text-ink-muted">{formatTime(sale.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${dashboardTheme.navy800} 0%, ${dashboardTheme.navy700} 100%)`,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[linear-gradient(135deg,_transparent_40%,_rgba(255,255,255,0.03)_50%)]" />
          </div>
          <div className="relative z-10">
            <div className="border-b border-white/5 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">Low Stock Alerts</h3>
                <button
                  onClick={() => navigate("/inventory")}
                  className="text-xs font-medium transition-colors hover:text-ink"
                  style={{ color: dashboardTheme['ink-muted'] }}
                >
                  View all
                </button>
              </div>
            </div>
            {lowStockLoading ? (
              <div className="px-6 py-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-24 bg-navy-700/30 rounded animate-pulse" />
                    <div className="flex-1 h-4 bg-navy-700/30 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : lowStockError ? (
              <div className="px-6 py-6 text-center">
                <p className="text-sm text-ink-muted mb-3">{lowStockError}</p>
                <button
                  onClick={loadLowStock}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5"
                  style={{ color: dashboardTheme.accent }}
                >
                  Retry
                </button>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-ink-muted">No low-stock items for this period.</p>
              </div>
            ) : (
              <div className="px-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium uppercase tracking-wide"
                          style={{ color: dashboardTheme['ink-muted'] }}>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Reorder at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {lowStockItems.slice(0, 8).map((item) => {
                        const critical = item.quantity === 0;
                        const urgent = item.quantity <= Math.max(item.minLevel * 0.25, 1);
                        const qtyColor = critical
                          ? dashboardTheme.danger
                          : urgent
                          ? dashboardTheme.accent
                          : '#ffc75f';
                        const product = item.product ?? { name: "Unknown product", SKU: "" };
                        return (
                          <tr key={item._id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex flex-col">
                                <span className="text-ink font-medium">{product.name}</span>
                                <span className="text-xs text-ink-muted">{product.SKU}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold" style={{ color: qtyColor }}>{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-ink-muted">{item.minLevel}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}