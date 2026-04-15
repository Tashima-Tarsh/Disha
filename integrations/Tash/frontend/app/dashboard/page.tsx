"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gqlRequest } from "@/lib/graphql";
import { getToken, getUser, clearAuth } from "@/lib/auth";

const LIST_CASES_QUERY = `
  query { listAuditCases { id title description status createdAt updatedAt } }
`;

const CREATE_CASE_MUTATION = `
  mutation CreateAuditCase($title: String!, $description: String!) {
    createAuditCase(title: $title, description: $description) {
      id title description status createdAt updatedAt
    }
  }
`;

interface AuditCase {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  in_progress: "bg-blue-900/40 text-blue-300 border-blue-700",
  resolved:    "bg-green-900/40 text-green-300 border-green-700",
  closed:      "bg-gray-800 text-gray-400 border-gray-700",
};

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<AuditCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const token = getToken();
  const user = getUser();

  const loadCases = useCallback(async () => {
    if (!token) return;
    try {
      const data = await gqlRequest<{ listAuditCases: AuditCase[] }>(
        LIST_CASES_QUERY, {}, token
      );
      setCases(data.listAuditCases);
    } catch {
      // silently ignore; user will see empty state
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { router.replace("/login"); return; }
    loadCases();
  }, [token, router, loadCases]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!newTitle.trim()) { setFormError("Title is required"); return; }
    setCreating(true);
    try {
      const data = await gqlRequest<{ createAuditCase: AuditCase }>(
        CREATE_CASE_MUTATION,
        { title: newTitle, description: newDesc },
        token!
      );
      setCases((prev) => [data.createAuditCase, ...prev]);
      setShowModal(false);
      setNewTitle("");
      setNewDesc("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-white text-lg">Tashu Auditor Core</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Cases", value: cases.length },
            { label: "Open", value: cases.filter(c => c.status === "open").length },
            { label: "In Progress", value: cases.filter(c => c.status === "in_progress").length },
            { label: "Resolved", value: cases.filter(c => c.status === "resolved").length },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Cases table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Audit Cases</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Case
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading...</div>
          ) : cases.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <p className="text-lg font-medium text-gray-400">No audit cases yet</p>
              <p className="text-sm mt-1">Create your first audit case to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {cases.map((c) => (
                <div key={c.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-800/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{c.title}</p>
                    {c.description && (
                      <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">{formatDate(c.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.closed}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">New Audit Case</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Audit case title"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the audit case..."
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                />
              </div>
              {formError && (
                <div className="px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
