import { LucideIcon } from "lucide-react";
import { useCountUp } from "./useCountUp";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  delay?: string;
  numericValue?: number;
  format?: (value: number) => string;
}

const colorStyles: Record<string, { bg: string; text: string }> = {
  amber: { bg: "bg-amber-600/15", text: "text-amber-500" },
  sky: { bg: "bg-sky-600/15", text: "text-sky-500" },
  emerald: { bg: "bg-emerald-600/15", text: "text-emerald-500" },
  violet: { bg: "bg-violet-600/15", text: "text-violet-500" },
  rose: { bg: "bg-rose-600/15", text: "text-rose-500" },
  blue: { bg: "bg-blue-600/15", text: "text-blue-500" },
  fuchsia: { bg: "bg-fuchsia-600/15", text: "text-fuchsia-500" },
  lime: { bg: "bg-lime-600/15", text: "text-lime-500" },
  orange: { bg: "bg-orange-600/15", text: "text-orange-500" },
  yellow: { bg: "bg-yellow-600/15", text: "text-yellow-500" },
  default: { bg: "bg-slate-600/15", text: "text-slate-500" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = "default",
  delay,
  numericValue,
  format,
}: StatCardProps) {
  const animated = useCountUp(typeof numericValue === "number" ? numericValue : 0);
  const display =
    typeof numericValue === "number" && format ? format(animated) : value;
  const style = colorStyles[color] || colorStyles.default;
  return (
    <div
      className="card lift fade-up"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="label">{label}</span>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${style.bg}`}>
          <Icon size={20} className={style.text} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-slate-50">{display}</p>
        {trend && (
          <span
            className={`text-sm font-medium ${trendUp ? "text-emerald-400" : "text-red-400"}`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
