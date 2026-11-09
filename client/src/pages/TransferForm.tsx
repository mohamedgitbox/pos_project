import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

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
    return <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">Only ADMIN or MANAGER can create transfers.</div>;
  }

  if (loading) {
    return <div className="card p-10 text-center text-sm text-slate-400">Loading transfer form...</div>;
  }

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Create Stock Transfer</h1>
        <p className="text-sm text-slate-400">Select source branch, destination branch, and items to transfer.</p>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      <form onSubmit={submit} className="space-y-6 fade-up">
        <div className="card grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="fromBranchId">From Branch</label>
            <select
              id="fromBranchId"
              value={fromBranchId}
              onChange={(event) => setFromBranchId(event.target.value)}
              disabled={!!user?.branchId}
              required
              className="input-well w-full p-2 text-sm disabled:bg-slate-900/80 disabled:text-slate-500"
            >
              <option value="">Select source branch</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="toBranchId">To Branch</label>
            <select
              id="toBranchId"
              value={toBranchId}
              onChange={(event) => setToBranchId(event.target.value)}
              required
              className="input-well w-full p-2 text-sm"
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

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Items</h2>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              Add Item
            </button>
          </div>

          {stockLoading && <div className="mt-4 text-sm text-slate-400">Loading source branch stock...</div>}

          <div className="mt-4 space-y-4">
            {items.map((item, index) => {
              const avail = available[item.productId] ?? 0;
              return (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4 md:grid-cols-12">
                  <select
                    value={item.productId}
                    onChange={(event) => updateItem(index, "productId", event.target.value)}
                    required
                    className="input-well p-2 text-sm md:col-span-7"
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
                    className="input-well p-2 text-sm md:col-span-3"
                  />

                  <button
                    type="button"
                    onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))}
                    disabled={items.length === 1}
                    className="text-sm font-medium text-red-500 hover:text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-700 pt-4 text-base font-bold text-slate-50">
            <span>Total Units</span>
            <span>{totalUnits}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/transfers" className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || stockLoading}
            className="btn-primary px-4 py-2 text-sm"
          >
            {saving ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}