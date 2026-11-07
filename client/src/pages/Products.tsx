import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Product {
  _id: string;
  name: string;
  SKU: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  totalStock: number;
}

interface BranchOption {
  _id: string;
  name: string;
}

interface FormState {
  name: string;
  SKU: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
}

const emptyForm: FormState = {
  name: "",
  SKU: "",
  barcode: "",
  costPrice: "",
  sellingPrice: "",
};

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function money(value: string): string {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed.toFixed(2);
}

export default function Products() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole(["ADMIN", "MANAGER"]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustBranchId, setAdjustBranchId] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/products");
      setProducts(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get("/sales/branches");
      setBranches(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    if (canManage) {
      void load();
      void loadBranches();
    } else {
      setLoading(false);
    }
  }, [canManage]);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }) as FormState);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/products", form);
      setSuccess("Product added successfully.");
      setForm(emptyForm);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/products/${id}`);
      setSuccess("Product deleted successfully.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openAdjust = (product: Product) => {
    setAdjustProduct(product);
    setAdjustBranchId(user?.branchId ?? branches[0]?._id ?? "");
    setAdjustQuantity("");
    setError("");
    setSuccess("");
  };

  const closeAdjust = () => {
    setAdjustProduct(null);
    setAdjustBranchId("");
    setAdjustQuantity("");
  };

  const submitAdjust = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustProduct) return;

    const quantity = Number(adjustQuantity);
    if (adjustQuantity.trim() === "" || !Number.isInteger(quantity) || quantity < 0) {
      const message = "Quantity must be a non-negative whole number.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!adjustBranchId) {
      const message = "Please select a branch.";
      setError(message);
      toast.error(message);
      return;
    }

    setAdjustSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/products/${adjustProduct._id}/adjust-stock`, {
        branchId: adjustBranchId,
        quantity,
        type: "SET",
      });
      const message = `Stock updated for ${adjustProduct.name}.`;
      setSuccess(message);
      toast.success(message);
      closeAdjust();
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setAdjustSaving(false);
    }
  };

  if (!canManage) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN or MANAGER can manage products.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setError("");
            setSuccess("");
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {open ? "Close Form" : "Add Product"}
        </button>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Product</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <input
              name="name"
              value={form.name}
              onChange={change}
              placeholder="Name"
              required
              className="w-full rounded border border-gray-300 p-2 text-sm"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="SKU"
                value={form.SKU}
                onChange={change}
                placeholder="SKU"
                required
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
              <input
                name="barcode"
                value={form.barcode}
                onChange={change}
                placeholder="Barcode"
                required
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={change}
                placeholder="Cost Price"
                required
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={change}
                placeholder="Selling Price"
                required
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitAdjust} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Adjust Stock</h2>
              <button type="button" onClick={closeAdjust} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Product: <span className="font-medium text-gray-900">{adjustProduct.name}</span>
            </div>
            <div className="text-xs text-gray-500">Current total stock: {adjustProduct.totalStock}</div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Branch</label>
              <select
                value={adjustBranchId}
                onChange={(event) => setAdjustBranchId(event.target.value)}
                required
                className="w-full rounded border border-gray-300 p-2 text-sm"
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Quantity</label>
              <input
                type="number"
                min="0"
                step="1"
                value={adjustQuantity}
                onChange={(event) => setAdjustQuantity(event.target.value)}
                required
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeAdjust}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustSaving}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {adjustSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No products found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Cost Price</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">Stock: {product.totalStock}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>{product.SKU}</div>
                    <div className="text-xs text-gray-500">{product.barcode}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{money(product.costPrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{money(product.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openAdjust(product)}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Adjust Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(product._id)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}