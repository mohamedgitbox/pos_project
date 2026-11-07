import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Pos from "./pages/Pos";
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
              <Route path="/branches" element={<Placeholder name="Branches" />} />
              <Route path="/users" element={<Placeholder name="Users" />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Placeholder name="Inventory" />} />
              <Route path="/sales" element={<Placeholder name="Sales" />} />
              <Route path="/purchases" element={<Placeholder name="Purchases" />} />
              <Route path="/transfers" element={<Placeholder name="Transfers" />} />
              <Route path="/reports" element={<Placeholder name="Reports" />} />
              <Route path="/audit-log" element={<Placeholder name="Audit Log" />} />
              <Route path="/pos" element={<Pos />} />
              <Route path="/my-sales" element={<Placeholder name="My Sales" />} />
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
