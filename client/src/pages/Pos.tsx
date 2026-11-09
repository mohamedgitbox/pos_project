import { useEffect, useMemo, useState } from "react";
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
  stock: number;
}

interface BranchOption {
  _id: string;
  name: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface CheckoutResponse {
  _id: string;
  invoiceNo: string;
  totalAmount: string;
  timestamp: string;
}

interface ReceiptItem {
  product: { _id: string; name: string; SKU: string; barcode: string } | null;
  quantity: number;
  price: string;
  subtotal: string;
}

interface ReceiptDetail {
  _id: string;
  invoiceNo: string;
  branch: { _id: string; name: string } | null;
  user: { _id: string; name: string } | null;
  totalAmount: string;
  timestamp: string;
  items: ReceiptItem[];
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

export default function Pos() {
  const { user, hasRole } = useAuth();
  const canUsePos = hasRole(["ADMIN", "MANAGER", "CASHIER"]);

  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);

  const branchId = user?.branchId ?? selectedBranchId;

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      if (!branchId) {
        throw new Error("No branch selected");
      }
      const res = await api.get(`/inventory/branch/${branchId}`);
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
      const data = res.data.data as BranchOption[];
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranchId((prev) => prev || data[0]._id);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    if (!canUsePos) {
      setLoading(false);
      return;
    }
    void loadProducts();
  }, [canUsePos, branchId]);

  useEffect(() => {
    if (canUsePos && !user?.branchId) {
      void loadBranches();
    }
  }, [canUsePos, user?.branchId]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.SKU.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q)
    );
  }, [products, search]);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.sellingPrice) * item.quantity, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    setReceipt(null);
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setReceipt(null);
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item._id !== id));
      return;
    }
    setCart((prev) => prev.map((item) => (item._id === id ? { ...item, quantity } : item)));
  };

  const checkout = async () => {
    if (!branchId) {
      toast.error("Select a branch first.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    setCheckingOut(true);
    setError("");
    try {
      const res = await api.post("/sales", {
        branchId,
        items: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          price: Number(item.sellingPrice),
        })),
      });
      const data = res.data.data as CheckoutResponse;
      const detail = await api.get(`/sales/${data._id}`);
      setReceipt(detail.data.data as ReceiptDetail);
      setCart([]);
      toast.success(`Sale ${data.invoiceNo} completed.`);
      await loadProducts();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (!canUsePos) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        Only ADMIN, MANAGER, or CASHIER can use the POS.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 fade-up">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">POS</h1>
          {!user?.branchId && (
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              className="input-well px-3 py-2 text-sm"
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products by name, SKU, or barcode..."
          className="input-well w-full px-3 py-2 text-sm"
        />

        {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

        {loading ? (
          <div className="card p-10 text-center text-sm text-slate-400">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-400">
            No products found.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="lift rounded-xl border border-slate-700 bg-slate-800 p-4 text-left shadow-sm transition hover:border-amber-600/50 hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-slate-100">{product.name}</div>
                <div className="mt-1 text-xs text-slate-400">{product.SKU}</div>
                <div className="mt-3 text-sm font-bold text-amber-500">{money(product.sellingPrice)}</div>
                <div className="mt-1 text-xs text-slate-400">Stock: {product.stock}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-slate-50">Cart</h2>

          {cart.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Cart is empty.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="border-b border-slate-700/50 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-slate-100">{item.name}</div>
                    <div className="text-sm font-semibold text-slate-100">
                      {money(Number(item.sellingPrice) * item.quantity)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-slate-400">{money(item.sellingPrice)} each</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="h-7 w-7 rounded border border-slate-600 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="h-7 w-7 rounded border border-slate-600 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 text-base font-bold text-slate-50">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>

              <button
                type="button"
                onClick={() => void checkout()}
                disabled={checkingOut || cart.length === 0 || !branchId}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingOut ? "Processing..." : "Checkout"}
              </button>
            </div>
          )}
        </div>

        {receipt && (
          <div id="receipt" className="card p-4">
            <h2 className="text-lg font-semibold text-slate-50">{receipt.branch?.name ?? "Receipt"}</h2>
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <div>Invoice: {receipt.invoiceNo}</div>
              <div>Cashier: {receipt.user?.name ?? "Unknown"}</div>
              <div className="text-xs text-slate-400">{new Date(receipt.timestamp).toLocaleString()}</div>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-1 pr-2 font-medium">Item</th>
                  <th className="py-1 pr-2 text-right font-medium">Qty</th>
                  <th className="py-1 pr-2 text-right font-medium">Price</th>
                  <th className="py-1 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipt.items.map((item) => (
                  <tr key={item.product?._id}>
                    <td className="py-1 pr-2 text-gray-900">{item.product?.name ?? "Deleted product"}</td>
                    <td className="py-1 pr-2 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-1 pr-2 text-right text-gray-700">{money(item.price)}</td>
                    <td className="py-1 text-right text-gray-900">{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 text-base font-bold text-gray-900">
                  <td className="py-2 pr-2">Total</td>
                  <td />
                  <td />
                  <td className="py-2 text-right">{money(receipt.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-3 text-center text-sm text-gray-500">Thank you for your purchase!</div>
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden mt-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Print Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}