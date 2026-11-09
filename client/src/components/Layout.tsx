import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, Building2, Users, Package, Warehouse, ShoppingCart, Truck, ArrowLeftRight, BarChart3, ClipboardList, Monitor } from "lucide-react";
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

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const links = hasRole(["ADMIN"]) ? adminLinks : hasRole(["MANAGER"]) ? managerLinks : cashierLinks;
  const initials = (name?: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      <aside className="fixed left-0 top-0 w-64 h-screen bg-slate-950 border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-amber-600 rounded-sm" />
            <span className="text-lg font-bold text-white tracking-tight">POS System</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  active
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Icon size={18} className={active ? "text-white" : "text-slate-500 group-hover:text-amber-500"} />
                <span className="text-sm font-medium">{link.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 bg-amber-300 rounded-full" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-white/5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-600/20 ring-2 ring-amber-600">
              <span className="text-xs font-bold text-amber-500">{initials(user?.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="ml-64 flex-1 bg-slate-900 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 glass border-b border-white/5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-slate-200">{user?.name}</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/20">
              {user?.role}
            </span>
          </div>
          <button
            onClick={async () => { await logout(); window.location.href = "/login"; }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
