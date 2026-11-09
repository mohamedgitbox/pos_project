import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Users as UsersIcon } from "lucide-react";
import api from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import StatusBadge, { roleVariant } from "../components/ui/StatusBadge";

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
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage system users and their roles."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Add User
          </button>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        headers={["Name", "Email", "Role", "Branch", "Created", "Actions"]}
        loading={loading}
        isEmpty={users.length === 0}
        emptyIcon={UsersIcon}
        emptyTitle="No users found"
        emptyMessage="Invite your team members to get started."
      >
        {users.map((user) => (
          <tr key={user._id}>
            <td className="font-medium text-slate-900">{user.name}</td>
            <td>{user.email}</td>
            <td>
              <StatusBadge variant={roleVariant(user.role)}>{user.role}</StatusBadge>
            </td>
            <td>{user.branchName ?? "—"}</td>
            <td className="text-slate-500">{formatDate(user.createdAt)}</td>
            <td className="text-right">
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => edit(user)} className="text-sm font-medium text-blue-600 hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => remove(user._id)}
                  disabled={deletingId === user._id}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingId === user._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{editingId ? "Edit User" : "Add User"}</h2>
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="text-sm text-red-600">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password {editingId ? "(leave blank to keep current)" : ""}
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={change}
                  minLength={6}
                  required={!editingId}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={change}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <select
                  name="branchId"
                  value={form.branchId}
                  onChange={change}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
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
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
