interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  RECEIVED: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  IN_TRANSIT: { bg: "bg-sky-500/15", text: "text-sky-400" },
  ORDERED: { bg: "bg-sky-500/15", text: "text-sky-400" },
  PENDING: { bg: "bg-amber-500/15", text: "text-amber-400" },
  CANCELLED: { bg: "bg-red-500/15", text: "text-red-400" },
  DEFAULT: { bg: "bg-slate-500/15", text: "text-slate-300" },
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
