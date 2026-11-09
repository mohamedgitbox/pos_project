import { ReactNode } from "react";

export type BadgeVariant = "success" | "pending" | "danger" | "neutral" | "info";

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export default function StatusBadge({ variant = "neutral", children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeStyles[variant]}`}
    >
      {children}
    </span>
  );
}

/** Map common entity statuses to badge variants (used across POs and Transfers). */
export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "RECEIVED":
      return "success";
    case "ORDERED":
    case "SHIPPED":
    case "IN_TRANSIT":
      return "info";
    case "PENDING":
      return "pending";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

/** Map user roles to badge variants. */
export function roleVariant(role: string): BadgeVariant {
  switch (role) {
    case "ADMIN":
      return "success";
    case "MANAGER":
      return "info";
    default:
      return "neutral";
  }
}
