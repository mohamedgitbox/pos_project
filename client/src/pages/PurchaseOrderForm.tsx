import { useEffect, useMemo, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";

interface Branch {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  SKU: string;
}

interface ItemRow {
  productId: string;
  orderedQty: string;
  unitCost: string;
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function money(value: number | string): string {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? String(value) : parsed.toFixed(2);
}

const newRow = (): ItemRow => ({ productId: "", orderedQty: "1", unitCost: "" });

export default function PurchaseOrderForm() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const initialBranchId = user?.branchId ?? "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [branchId, setBranchId] = useState(initialBranchId);
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [branchesRes, productsRes] = await Promise.all([api.get("/branches"), api.get("/products")]);
      const branchesData = branchesRes.data.data as Branch[];
      const productsData = productsRes.data.data as Product[];
      setBranches(branchesData);
      setProducts(productsData);
      if (!initialBranchId && branchesData.length > 0) {
        setBranchId(branchesData[0]._id);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      void load();
    } else {
      setLoading(false);
    }
  }, [canManage]);

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.orderedQty);
      const cost = Number(item.unitCost);
      return sum + (Number.isFinite(qty) && Number.isFinite(cost) ? qty * cost : 0);
    }, 0);
  }, [items]);

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const addItem = () => setItems((prev) => [...prev, newRow()]);
  const removeItem = (index: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : prev));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const parsedItems = items.map((row) => ({
      productId: row.productId,
      orderedQty: Number(row.orderedQty),
      unitCost: Number(row.unitCost),
      rawQty: row.orderedQty.trim(),
      rawCost: row.unitCost.trim(),
    }));

    if (!supplierName.trim()) {
      setError("Supplier name is required.");
      return;
    }
    if (!branchId) {
      setError("Branch is required.");
      return;
    }
    if (
      parsedItems.some(
        (item) =>
          !item.productId ||
          item.rawQty === "" ||
          !Number.isInteger(item.orderedQty) ||
          item.orderedQty <= 0 ||
          item.rawCost === "" ||
          !Number.isFinite(item.unitCost) ||
          item.unitCost < 0
      )
    ) {
      setError("Each item needs a product, a positive whole quantity, and a valid unit cost.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/purchase-orders", {
        supplierName: supplierName.trim(),
        branchId,
        items: parsedItems.map(({ productId, orderedQty, unitCost }) => ({ productId, orderedQty, unitCost })),
      });
      toast.success("Purchase order created.");
      navigate("/purchase-orders");
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN or MANAGER can create purchase orders.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        subtitle="Add supplier, branch, and ordered items."
        actions={
          <Link to="/purchase-orders" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading form data...</div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Supplier Name</label>
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Branch</label>
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Items</h2>
              <button type="button" onClick={addItem} className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50">
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-12">
                  <select
                    value={item.productId}
                    onChange={(event) => updateItem(index, "productId", event.target.value)}
                    required
                    className="rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 md:col-span-5"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} ({product.SKU})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.orderedQty}
                    onChange={(event) => updateItem(index, "orderedQty", event.target.value)}
                    placeholder="Qty"
                    required
                    className="rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 md:col-span-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitCost}
                    onChange={(event) => updateItem(index, "unitCost", event.target.value)}
                    placeholder="Unit cost"
                    required
                    className="rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 md:col-span-2"
                  />
                  <div className="flex items-center text-sm text-gray-600 md:col-span-2">
                    Subtotal: {money(Number(item.orderedQty || 0) * Number(item.unitCost || 0))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 md:col-span-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-base font-bold text-gray-900">
              <span>Total Cost</span>
              <span>{money(totalCost)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link to="/purchase-orders" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? "Saving..." : "Create PO"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}