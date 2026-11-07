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
  totalStock: number;
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
  const [receipt, setReceipt] = useState<CheckoutResponse | null>(null);

  const branchId = user?.branchId ?? selectedBranchId;

  const loadProducts = async () => {
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
  }, [canUsePos]);

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
      setReceipt(data);
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        Only ADMIN, MANAGER, or CASHIER can use the POS.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">POS</h1>
          {!user?.branchId && (
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            No products found.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.totalStock <= 0}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                <div className="mt-1 text-xs text-gray-500">{product.SKU}</div>
                <div className="mt-3 text-sm font-bold text-blue-700">{money(product.sellingPrice)}</div>
                <div className="mt-1 text-xs text-gray-500">Stock: {product.totalStock}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Cart</h2>

          {cart.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">Cart is empty.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="border-b border-gray-100 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {money(Number(item.sellingPrice) * item.quantity)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">{money(item.sellingPrice)} each</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>

              <button
                type="button"
                onClick={() => void checkout()}
                disabled={checkingOut || cart.length === 0 || !branchId}
                className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingOut ? "Processing..." : "Checkout"}
              </button>
            </div>
          )}
        </div>

        {receipt && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <div>Invoice: {receipt.invoiceNo}</div>
              <div>Total: {money(receipt.totalAmount)}</div>
              <div className="text-xs text-gray-500">{new Date(receipt.timestamp).toLocaleString()}</div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Print Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}