import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";

interface Branch { _id: string; name: string }
interface StockProduct { productId: string; name: string; SKU: string; quantity: number }
interface ItemRow { productId: string; quantity: string }

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const e = error as { response?: { data?: { error?: string } } };
    if (e.response?.data?.error) return e.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

const emptyItem = (): ItemRow => ({ productId: "", quantity: "1" });

export default function TransferForm() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [fromBranchId, setFromBranchId] = useState(user?.branchId ?? "");
  const [toBranchId, setToBranchId] = useState("");
  const [stock, setStock] = useState<StockProduct[]>([]);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    void (async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get("/branches");
        const data = res.data.data as Branch[];
        setBranches(data);
        setFromBranchId((prev) => prev || data[0]?._id || "");
      } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
    })();
  }, [canManage]);

  useEffect(() => {
    if (!canManage || !fromBranchId) { setStock([]); return; }
    void (async () => {
      setStockLoading(true); setError("");
      try {
        const res = await api.get(`/transfers/branch-stock/${fromBranchId}`);
        setStock(res.data.data as StockProduct[]);
        setToBranchId((prev) => (prev === fromBranchId ? "" : prev));
        setItems([emptyItem()]);
      } catch (err) { setError(errorMessage(err)); } finally { setStockLoading(false); }
    })();
  }, [canManage, fromBranchId]);

  const available = useMemo(() => stock.reduce<Record<string, number>>((acc, p) => { acc[p.productId] = p.quantity; return acc; }, {}), [stock]);
  const selected = useMemo(() => new Set(items.map((i) => i.productId).filter(Boolean)), [items]);
  const totalUnits = useMemo(() => items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0), [items]);
  const updateItem = (index: number, field: keyof ItemRow, value: string) => setItems((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) {
      setError("Select different source and destination branches.");
      return;
    }

    const parsed: { productId: string; quantity: number }[] = [];
    for (const row of items) {
      const quantity = Number(row.quantity);
      if (!row.productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > (available[row.productId] ?? 0)) {
        setError("Enter a valid quantity within available stock for each product.");
        return;
      }
      parsed.push({ productId: row.productId, quantity });
    }

    if (new Set(parsed.map((item) => item.productId)).size !== parsed.length) {
      setError("Duplicate products are not allowed.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/transfers", { fromBranchId, toBranchId, items: parsed });
      toast.success("Transfer created successfully.");
      navigate(`/transfers/${res.data.data._id}`);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN or MANAGER can create transfers.</div>;
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading transfer form...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Stock Transfer"
        subtitle="Select source branch, destination branch, and items to transfer."
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="fromBranchId">From Branch</label>
            <select
              id="fromBranchId"
              value={fromBranchId}
              onChange={(event) => setFromBranchId(event.target.value)}
              disabled={!!user?.branchId}
              required
              className="w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Select source branch</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="toBranchId">To Branch</label>
            <select
              id="toBranchId"
              value={toBranchId}
              onChange={(event) => setToBranchId(event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            >
              <option value="">Select destination branch</option>
              {branches
                .filter((branch) => branch._id !== fromBranchId)
                .map((branch) => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Add Item
            </button>
          </div>

          {stockLoading && <div className="mt-4 text-sm text-gray-500">Loading source branch stock...</div>}

          <div className="mt-4 space-y-4">
            {items.map((item, index) => {
              const avail = available[item.productId] ?? 0;
              return (
                <div key={index} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-12">
                  <select
                    value={item.productId}
                    onChange={(event) => updateItem(index, "productId", event.target.value)}
                    required
                    className="rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 md:col-span-7"
                  >
                    <option value="">Select product</option>
                    {stock
                      .filter((product) => product.quantity > 0)
                      .map((product) => (
                        <option
                          key={product.productId}
                          value={product.productId}
                          disabled={selected.has(product.productId) && item.productId !== product.productId}
                        >
                          {product.name} ({product.SKU}) - available: {product.quantity}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    max={avail || undefined}
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                    placeholder="Qty"
                    required
                    className="rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 md:col-span-3"
                  />

                  <button
                    type="button"
                    onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))}
                    disabled={items.length === 1}
                    className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-base font-bold text-gray-900">
            <span>Total Units</span>
            <span>{totalUnits}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/transfers" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || stockLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}