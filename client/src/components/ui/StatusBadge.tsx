interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

// Tints follow the Tillwave palette: badge text must pass contrast on navy
// surfaces, so all text colors are the -300 shade (or accentText #fbbf24).
// #fbbf24 on the amber tint over navy = ~9:1. Never white on #d97706.
const statusStyles: Record<string, { bg: string; text: string }> = {
  // Roles
  ADMIN: { bg: "bg-[#fbbf24]/10", text: "text-[#fbbf24]" },
  MANAGER: { bg: "bg-sky-400/10", text: "text-sky-300" },
  CASHIER: { bg: "bg-emerald-400/10", text: "text-emerald-300" },
  // Statuses
  RECEIVED: { bg: "bg-emerald-400/10", text: "text-emerald-300" },
  IN_TRANSIT: { bg: "bg-sky-400/10", text: "text-sky-300" },
  ORDERED: { bg: "bg-sky-400/10", text: "text-sky-300" },
  PENDING: { bg: "bg-[#fbbf24]/10", text: "text-[#fbbf24]" },
  CANCELLED: { bg: "bg-red-400/10", text: "text-red-300" },
  // Audit actions
  CREATE: { bg: "bg-emerald-400/10", text: "text-emerald-300" },
  UPDATE: { bg: "bg-sky-400/10", text: "text-sky-300" },
  DELETE: { bg: "bg-[#ff8fa0]/10", text: "text-[#ff8fa0]" },
  CHECKOUT: { bg: "bg-emerald-400/10", text: "text-emerald-300" },
  INVENTORY_ADJUST: { bg: "bg-sky-400/10", text: "text-sky-300" },
  DEFAULT: { bg: "bg-white/5", text: "text-ink-muted" },
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const style = statusStyles[status.toUpperCase()] || statusStyles.DEFAULT;
  const classes =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${style.bg} ${style.text} ${classes}`}
    >
      {status}
    </span>
  );
}
