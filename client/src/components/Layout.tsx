import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut, LayoutDashboard, Building2, Users, Package, Warehouse, ShoppingCart,
  Truck, ArrowLeftRight, BarChart3, ClipboardList, Monitor, Menu, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, FocusEvent as ReactFocusEvent } from "react";

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

const EXPANDED_W = 264;
const RAIL_W = 72;
const STORAGE_KEY = "tillwave-sidebar-collapsed";

const C = {
  navy950: "#071629",
  navy800: "#102a43",
  navy700: "#173857",
  accent: "#d97706",
  accentText: "#fbbf24", // amber-400: passes 4.5:1 on navy (amber-600 does NOT)
  ink: "#dcecf5",
  inkMuted: "#93a7bc",
  danger: "#ff8fa0",
};

const css = `
  html { scrollbar-gutter: stable; }
  [id] { scroll-margin-top: 84px; }
  .tw-scroll { scrollbar-width: thin; scrollbar-color: ${C.navy700} transparent; }
  .tw-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
  .tw-scroll::-webkit-scrollbar-track { background: transparent; }
  .tw-scroll::-webkit-scrollbar-thumb { background: ${C.navy700}; border-radius: 8px; }
  .tw-scroll::-webkit-scrollbar-thumb:hover { background: ${C.accent}; }
  .tw-link { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px;
    border-radius: 10px; color: ${C.ink}; text-decoration: none;
    transition: background-color .15s ease; }
  .tw-link:hover { background: rgba(255,255,255,.06); }
  .tw-link:focus-visible { outline: 2px solid ${C.accentText}; outline-offset: 2px; }
  .tw-link[data-active="true"] { background: rgba(217,119,6,.16);
    box-shadow: inset 3px 0 0 ${C.accent}; color: #fff; }
  .tw-link[data-collapsed="true"] { justify-content: center; padding: 0; }
  .tw-iconbtn { display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; flex: none; border-radius: 10px; border: 1px solid transparent;
    background: transparent; color: ${C.ink}; cursor: pointer;
    transition: background-color .15s ease; }
  .tw-iconbtn:hover { background: rgba(255,255,255,.08); }
  .tw-iconbtn:focus-visible { outline: 2px solid ${C.accentText}; outline-offset: 2px; }
  .tw-logout { display: inline-flex; align-items: center; gap: 8px; min-height: 44px;
    padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,143,160,.25);
    background: rgba(255,107,127,.10); color: ${C.danger}; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: background-color .15s ease; }
  .tw-logout:hover { background: rgba(255,107,127,.2); }
  .tw-logout:focus-visible { outline: 2px solid ${C.danger}; outline-offset: 2px; }
  @keyframes tw-drawer-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  .tw-drawer { animation: tw-drawer-in .22s ease-out; }
  @media (prefers-reduced-motion: reduce) {
    .tw-drawer { animation: none; }
    .tw-anim, .tw-link, .tw-iconbtn, .tw-logout { transition: none !important; }
  }
`;

function readCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "true";
  } catch { /* storage unavailable */ }
  return typeof window !== "undefined" && window.innerWidth < 1280;
}

function initials(name?: string | null): string {
  if (!name) return "U";
  return name.split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);

  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isDesktop = viewportWidth >= 1024;
  const isWide = viewportWidth >= 1280;
  // 1024-1279 is ALWAYS the rail; only >=1280 honors the user's toggle.
  const effectiveCollapsed = isWide ? collapsed : true;
  const sidebarWidth = !isDesktop ? 0 : effectiveCollapsed ? RAIL_W : EXPANDED_W;
  const sidebarVisible = isDesktop && !effectiveCollapsed;

  const links = hasRole(["ADMIN"]) ? adminLinks : hasRole(["MANAGER"]) ? managerLinks : cashierLinks;
  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  // Viewport tracking (single source of truth for all breakpoints)
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Persist ONLY on explicit user toggle — never re-read storage on resize.
  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Clear tooltip when layout mode changes
  useEffect(() => { setTooltip(null); }, [effectiveCollapsed, isDesktop]);

  // Drawer: scroll lock + focus trap + focus restore + ESC + auto-close on desktop
  useEffect(() => {
    if (!mobileOpen) return;
    const panel = drawerRef.current;
    const trigger = hamburgerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    getFocusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMobileOpen(false); return; }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !panel?.contains(activeEl))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (activeEl === last || !panel?.contains(activeEl))) {
        e.preventDefault(); first.focus();
      }
    };
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      trigger?.focus();
    };
  }, [mobileOpen]);

  // Route change: close drawer + scroll to top (or to hash anchor)
  useEffect(() => {
    setMobileOpen(false);
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname, location.hash]);

  const showTip = (e: ReactMouseEvent<HTMLElement> | ReactFocusEvent<HTMLElement>, label: string) => {
    if (!effectiveCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  };
  const hideTip = () => setTooltip(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const renderLinks = (collapsedMode: boolean, onNavigate?: () => void) =>
    links.map((link) => {
      const Icon = link.icon;
      const active = isActive(link.to);
      return (
        <Link
          key={link.to}
          to={link.to}
          onClick={onNavigate}
          className="tw-link"
          data-active={active}
          data-collapsed={collapsedMode}
          aria-current={active ? "page" : undefined}
          aria-label={collapsedMode ? link.label : undefined}
          onMouseEnter={collapsedMode ? (e) => showTip(e, link.label) : undefined}
          onMouseLeave={collapsedMode ? hideTip : undefined}
          onFocus={collapsedMode ? (e) => showTip(e, link.label) : undefined}
          onBlur={collapsedMode ? hideTip : undefined}
        >
          <Icon size={18} style={{ color: active ? C.accentText : C.inkMuted, flex: "none" }} />
          {!collapsedMode && (
            <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {link.label}
            </span>
          )}
          {!collapsedMode && active && (
            <span aria-hidden="true" style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: 999, background: C.accent, flex: "none" }} />
          )}
        </Link>
      );
    });

  const userChip = (compact: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: compact ? 0 : "8px 10px", justifyContent: compact ? "center" : "flex-start", borderRadius: 10, background: compact ? "transparent" : "rgba(255,255,255,0.04)" }}>
      <div title={user?.name ?? "User"} style={{ width: 36, height: 36, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(217,119,6,0.2)", color: C.accentText, fontSize: 12, fontWeight: 700 }}>
        {initials(user?.name)}
      </div>
      {!compact && (
        <div style={{ minWidth: 0 }}>
          <p title={user?.name ?? "User"} style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.name ?? "User"}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.inkMuted }}>{user?.role}</p>
        </div>
      )}
    </div>
  );

  const brand = (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span aria-hidden="true" style={{ width: 8, height: 24, borderRadius: 3, background: C.accent, flex: "none" }} />
      {sidebarVisible && (
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
          POS System
        </span>
      )}
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.navy950 }}>
      <style>{css}</style>

      {/* Desktop sidebar / rail — single source of truth, no Tailwind breakpoint guessing */}
      {isDesktop && (
        <aside
          className="tw-anim"
          style={{ position: "fixed", left: 0, top: 0, zIndex: 40, height: "100dvh", width: sidebarWidth, display: "flex", flexDirection: "column", background: C.navy800, borderRight: "1px solid rgba(255,255,255,0.06)", transition: "width .25s ease", overflow: "hidden" }}
        >
          <div style={{ display: "flex", flexDirection: effectiveCollapsed ? "column" : "row", alignItems: "center", justifyContent: effectiveCollapsed ? "center" : "space-between", gap: 8, padding: effectiveCollapsed ? "12px 0" : "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {brand}
            {isWide && (
              <button type="button" onClick={toggleSidebar} className="tw-iconbtn"
                aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!effectiveCollapsed}>
                {effectiveCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
          </div>

          <nav aria-label="Main navigation" className="tw-scroll"
            onScroll={hideTip}
            style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 2 }}>
            {renderLinks(effectiveCollapsed)}
          </nav>

          <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {userChip(effectiveCollapsed)}
          </div>
        </aside>
      )}

      {/* Rail tooltip — rendered at root so overflow never clips it */}
      {isDesktop && effectiveCollapsed && tooltip && (
        <div role="tooltip" style={{ position: "fixed", left: RAIL_W + 10, top: tooltip.top, transform: "translateY(-50%)", zIndex: 60, background: C.navy700, color: C.ink, border: "1px solid rgba(255,255,255,0.1)", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,.45)", whiteSpace: "nowrap" }}>
          {tooltip.label}
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && !isDesktop && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <div aria-hidden="true" onClick={() => setMobileOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
          <div ref={drawerRef} id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu"
            className="tw-drawer tw-scroll"
            style={{ position: "absolute", left: 0, top: 0, height: "100dvh", width: "min(86vw, 320px)", display: "flex", flexDirection: "column", background: C.navy800, borderRight: "1px solid rgba(255,255,255,0.08)", overflowY: "auto", paddingLeft: "env(safe-area-inset-left)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.navy800, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true" style={{ width: 8, height: 24, borderRadius: 3, background: C.accent }} />
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>POS System</span>
              </span>
              <button type="button" className="tw-iconbtn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <nav aria-label="Main navigation" style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 2 }}>
              {renderLinks(false, () => setMobileOpen(false))}
            </nav>
            <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}>
              {userChip(false)}
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="tw-anim" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", marginLeft: sidebarWidth, transition: "margin-left .25s ease" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 16px", paddingTop: "calc(8px + env(safe-area-inset-top))", background: "rgba(16,42,67,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {!isDesktop && (
              <button ref={hamburgerRef} type="button" className="tw-iconbtn"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu" aria-controls="mobile-drawer" aria-expanded={mobileOpen}
                style={{ background: C.navy700, border: "1px solid rgba(255,255,255,0.08)" }}>
                <Menu size={20} />
              </button>
            )}
            <h2 title={user?.name ?? undefined} style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name}
            </h2>
            <span style={{ flex: "none", padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 999, background: "rgba(217,119,6,0.16)", color: C.accentText, border: "1px solid rgba(217,119,6,0.35)" }}>
              {user?.role}
            </span>
          </div>
          <button type="button" onClick={handleLogout} className="tw-logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </header>

        <main style={{ flex: 1, padding: "16px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}