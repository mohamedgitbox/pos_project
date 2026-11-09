import { LucideIcon } from "lucide-react";

export type StatTone = "emerald" | "blue" | "amber" | "red" | "violet" | "slate";

const toneStyles: Record<StatTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: StatTone;
  /** Optional trend line, e.g. "+12% vs yesterday". */
  trend?: {
    text: string;
    direction: "up" | "down";
  };
}

export default function StatCard({ icon: Icon, label, value, tone = "slate", trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {trend && (
        <p
          className={`mt-2 text-xs font-medium ${
            trend.direction === "up" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {trend.text}
        </p>
      )}
    </div>
  );
}
