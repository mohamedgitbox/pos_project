import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Pos from "./pages/Pos";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderForm from "./pages/PurchaseOrderForm";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import Transfers from "./pages/Transfers";
import TransferForm from "./pages/TransferForm";
import TransferDetail from "./pages/TransferDetail";
import Sales from "./pages/Sales";
import MySales from "./pages/MySales";
import Inventory from "./pages/Inventory";
import Users from "./pages/Users";
import { Toaster } from "react-hot-toast";

function Placeholder({ name }: { name: string }) {
  return <div className="text-xl font-semibold text-gray-500">{name}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route element={<ProtectedRoute requiredRoles={["ADMIN"]} />}>
                <Route path="/branches" element={<Placeholder name="Branches" />} />
                <Route path="/users" element={<Users />} />
                <Route path="/audit-log" element={<Placeholder name="Audit Log" />} />
              </Route>
              <Route element={<ProtectedRoute requiredRoles={["MANAGER", "ADMIN"]} />}>
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
                <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/transfers/new" element={<TransferForm />} />
                <Route path="/transfers/:id" element={<TransferDetail />} />
                <Route path="/reports" element={<Placeholder name="Reports" />} />
                <Route path="/sales" element={<Sales />} />
              </Route>
              <Route element={<ProtectedRoute requiredRoles={["CASHIER", "MANAGER", "ADMIN"]} />}>
                <Route path="/pos" element={<Pos />} />
                <Route path="/my-sales" element={<MySales />} />
              </Route>
            </Route>
          </Route>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
