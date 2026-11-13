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

// Tillwave dark theme color styles
const colorStyles: Record<string, { bg: string; text: string; icon: string; hover: string }> = {
  amber: {
    bg: "bg-accent/15",
    text: "text-accent",
    icon: "text-accent",
    hover: "hover:bg-accent/20",
  },
  sky: {
    bg: "bg-cyan-600/15",
    text: "text-cyan-400",
    icon: "text-cyan-400",
    hover: "hover:bg-cyan-600/20",
  },
  emerald: {
    bg: "bg-emerald-600/15",
    text: "text-emerald-400",
    icon: "text-emerald-400",
    hover: "hover:bg-emerald-600/20",
  },
  violet: {
    bg: "bg-violet-600/15",
    text: "text-violet-400",
    icon: "text-violet-400",
    hover: "hover:bg-violet-600/20",
  },
  rose: {
    bg: "bg-rose-600/15",
    text: "text-rose-400",
    icon: "text-rose-400",
    hover: "hover:bg-rose-600/20",
  },
  blue: {
    bg: "bg-blue-600/15",
    text: "text-blue-400",
    icon: "text-blue-400",
    hover: "hover:bg-blue-600/20",
  },
  fuchsia: {
    bg: "bg-fuchsia-600/15",
    text: "text-fuchsia-400",
    icon: "text-fuchsia-400",
    hover: "hover:bg-fuchsia-600/20",
  },
  lime: {
    bg: "bg-lime-600/15",
    text: "text-lime-400",
    icon: "text-lime-400",
    hover: "hover:bg-lime-600/20",
  },
  orange: {
    bg: "bg-orange-600/15",
    text: "text-orange-400",
    icon: "text-orange-400",
    hover: "hover:bg-orange-600/20",
  },
  yellow: {
    bg: "bg-yellow-600/15",
    text: "text-yellow-400",
    icon: "text-yellow-400",
    hover: "hover:bg-yellow-600/20",
  },
  default: {
    bg: "bg-navy-700/30",
    text: "text-ink-soft",
    icon: "text-ink-soft",
    hover: "hover:bg-navy-700/40",
  },
};

// CSS variables for Tillwave dashboard theme
const dashboardColors = {
  navy800: '#102a43',
  navy700: '#173857',
  accent: '#d97706',
  'ink-soft': '#dcecf5',
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
      className="group relative isolate rounded-2xl p-5 transition-all duration-300 lift fade-up"
      style={{
        animationDelay: delay,
        background: `linear-gradient(180deg, ${dashboardColors.navy800} 0%, ${dashboardColors.navy700} 100%)`,
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-ink-soft/70 tracking-wide">{label}</span>
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full ${style.bg} ${style.hover} transition-all duration-200`}
        >
          <Icon size={20} className={`${style.icon} transition-transform duration-200 group-hover:scale-110`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white tracking-tight">{display}</p>
        {trend && (
          <span
            className={`text-xs font-medium ${trendUp ? "text-emerald-400" : "text-red-400"}`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}