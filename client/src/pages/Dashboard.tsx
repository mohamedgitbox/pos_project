import { DollarSign, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const kpis = [
  { label: "Today's Sales", value: "$4,250.00", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Total Revenue", value: "$128,430.00", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  { label: "Low Stock Items", value: "12", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Active Branches", value: "3", icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome back, {user?.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
                <div className={`p-2 rounded-full ${kpi.bg}`}>
                  <Icon size={20} className={kpi.color} />
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
