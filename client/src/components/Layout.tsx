import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, Building2, Users, Package, Warehouse, ShoppingCart, Truck, ArrowLeftRight, BarChart3, ClipboardList, Monitor, Search, Bell, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const adminLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/users", label: "Users", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/purchase-orders", label: "Purchases", icon: Truck },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit-log", label: "Audit Log", icon: ClipboardList },
  { to: "/pos", label: "POS", icon: Monitor },
];

const managerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS", icon: Monitor },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/purchase-orders", label: "Purchases", icon: Truck },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

const cashierLinks = [
  { to: "/pos", label: "POS", icon: Monitor },
  { to: "/my-sales", label: "My Sales", icon: ShoppingCart },
];

const roleBadgeStyles: Record<string, string> = {
  ADMIN: "bg-emerald-500/15 text-emerald-400",
  MANAGER: "bg-blue-500/15 text-blue-400",
  CASHIER: "bg-slate-500/15 text-slate-300",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const links = hasRole(["ADMIN"]) ? adminLinks : hasRole(["MANAGER"]) ? managerLinks : cashierLinks;

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-slate-900">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Store size={18} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">POS System</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500" />}
                <Icon size={18} className={active ? "text-emerald-400" : ""} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile block */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
              {user ? initials(user.name) : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.name}</div>
              <span
                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeStyles[user?.role ?? ""] ?? roleBadgeStyles.CASHIER}`}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="ml-64 flex min-h-screen flex-col bg-slate-50">
        {/* Top navbar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-200/70 bg-white/80 px-8 py-3 backdrop-blur">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {user ? initials(user.name) : "?"}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-900">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.role}</div>
              </div>
              <button
                onClick={async () => { await logout(); window.location.href = "/login"; }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
