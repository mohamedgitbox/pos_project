import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Building2 } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";

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
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN can manage branches.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        subtitle="Manage your store branches."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Add Branch
          </button>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{editingId ? "Edit Branch" : "Add Branch"}</h2>
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
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <input
                  name="type"
                  value={form.type}
                  onChange={change}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={change}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={change}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
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

      <DataTable
        headers={["Name", "Type", "Location", "Phone", "Actions"]}
        loading={loading}
        isEmpty={branches.length === 0}
        emptyIcon={Building2}
        emptyTitle="No branches found"
        emptyMessage="Add your first branch to start tracking inventory."
      >
        {branches.map((branch) => (
          <tr key={branch._id}>
            <td className="font-medium text-slate-900">{branch.name}</td>
            <td>{branch.type}</td>
            <td>{branch.location}</td>
            <td>{branch.phone}</td>
            <td className="text-right">
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => edit(branch)} className="text-sm font-medium text-blue-600 hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => remove(branch._id)}
                  disabled={deletingId === branch._id}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingId === branch._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}