import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { StatusBadge } from "../components/ui/StatusBadge";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "CASHIER";
  branchId: string | null;
  branchName: string | null;
  createdAt?: string;
}

interface BranchOption {
  _id: string;
  name: string;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "CASHIER";
  branchId: string;
}

const ROLES: Array<UserRow["role"]> = ["ADMIN", "MANAGER", "CASHIER"];

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  role: "CASHIER",
  branchId: "",
};

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users");
      setUsers(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    api
      .get("/branches")
      .then((res) => setBranches(res.data.data))
      .catch(() => setBranches([]));
  }, []);

  const change = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        branchId: form.branchId || null,
      };
      if (editingId) {
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editingId}`, payload);
        toast.success("User updated successfully");
      } else {
        payload.password = form.password;
        await api.post("/users", payload);
        toast.success("User created successfully");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const edit = (user: UserRow) => {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      branchId: user.branchId ?? "",
    });
    setEditingId(user._id);
    setError("");
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setDeletingId(id);
    setError("");
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted successfully");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Users</h1>
          <p className="text-sm text-slate-400">Manage system users and their roles.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          Add User
        </button>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="card px-4 py-3 text-sm text-slate-400">No users found.</div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="tw-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-4 py-3 text-sm font-medium text-ink">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-ink">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge status={user.role} />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">{user.branchName ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-ink">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button onClick={() => edit(user)} className="mr-2 text-amber-600 hover:text-amber-500">
                      Edit
                    </button>
                    <button
                      onClick={() => remove(user._id)}
                      disabled={deletingId === user._id}
                      className="text-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      {deletingId === user._id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-800 border border-white/5 p-6 shadow-2xl fade-up">
            <h2 className="mb-4 text-xl font-bold text-slate-50">{editingId ? "Edit User" : "Add User"}</h2>
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="text-sm text-red-400">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  required
                  className="input-well block w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  required
                  className="input-well block w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Password {editingId ? "(leave blank to keep current)" : ""}
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={change}
                  minLength={6}
                  required={!editingId}
                  className="input-well block w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={change}
                  className="input-well block w-full px-3 py-2 text-sm"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Branch</label>
                <select
                  name="branchId"
                  value={form.branchId}
                  onChange={change}
                  className="input-well block w-full px-3 py-2 text-sm"
                >
                  <option value="">No branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
