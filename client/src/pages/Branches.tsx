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
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Only ADMIN can manage branches.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500">Manage your store branches.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Branch
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Branch" : "Add Branch"}</h2>
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="text-sm text-red-600">{error}</div>}