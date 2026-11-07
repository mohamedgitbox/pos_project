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
  { to: "/purchases", label: "Purchases", icon: Truck },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit-log", label: "Audit Log", icon: ClipboardList },
];

const managerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/purchases", label: "Purchases", icon: Truck },
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

  return (
    <div className="flex min-h-screen">
      <aside className="fixed w-64 bg-slate-900 text-white min-h-screen flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-700">POS System</div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? "bg-slate-700" : "hover:bg-slate-800"}`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="ml-64 flex-1 bg-gray-50 min-h-screen">
        <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium">{user?.name}</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{user?.role}</span>
          </div>
          <button
            onClick={async () => { await logout(); window.location.href = "/login"; }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
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
