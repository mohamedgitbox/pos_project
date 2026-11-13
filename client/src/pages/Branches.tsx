import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Branch {
  _id: string;
  name: string;
  type: string;
  location: string;
  phone: string;
  createdAt?: string;
}

interface FormState {
  name: string;
  type: string;
  location: string;
  phone: string;
}

const emptyForm: FormState = {
  name: "",
  type: "",
  location: "",
  phone: "",
};

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function Branches() {
  const { hasRole } = useAuth();
  const canManage = hasRole(["ADMIN"]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/branches");
      setBranches(res.data.data);
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

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editingId) {
        await api.put(`/branches/${editingId}`, form);
        setSuccess("Branch updated successfully.");
        setEditingId(null);
      } else {
        await api.post("/branches", form);
        setSuccess("Branch added successfully.");
      }
      setForm(emptyForm);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const edit = (branch: Branch) => {
    setForm({
      name: branch.name,
      type: branch.type,
      location: branch.location,
      phone: branch.phone,
    });
    setEditingId(branch._id);
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this branch?")) return;
    setDeletingId(id);
    setError("");
    try {
      await api.delete(`/branches/${id}`);
      toast.success("Branch deleted successfully");
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

  if (!canManage) {
    return <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-400">Only ADMIN can manage branches.</div>;
  }

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">Branches</h1>
          <p className="text-sm text-slate-400">Manage your store branches.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          Add Branch
        </button>
      </div>

      {error && <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}
      {success && <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">{success}</div>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-800 border border-white/5 p-6 shadow-2xl fade-up">
            <h2 className="text-xl font-bold mb-4 text-slate-50">{editingId ? "Edit Branch" : "Add Branch"}</h2>
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                <input
                  name="type"
                  value={form.type}
                  onChange={change}
                  required
                  className="input-well block w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={change}
                  required
                  className="input-well block w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={change}
                  required
                  className="input-well block w-full px-3 py-2 text-sm"
                />
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

      {loading ? (
        <div className="text-sm text-slate-400">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="card px-4 py-3 text-sm text-slate-400">No branches found.</div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="tw-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch._id}>
                  <td className="px-4 py-3 text-sm font-medium text-ink">{branch.name}</td>
                  <td className="px-4 py-3 text-sm text-ink">{branch.type}</td>
                  <td className="px-4 py-3 text-sm text-ink">{branch.location}</td>
                  <td className="px-4 py-3 text-sm text-ink">{branch.phone}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => edit(branch)}
                      className="mr-2 text-amber-600 hover:text-amber-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(branch._id)}
                      disabled={deletingId === branch._id}
                      className="text-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      {deletingId === branch._id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}