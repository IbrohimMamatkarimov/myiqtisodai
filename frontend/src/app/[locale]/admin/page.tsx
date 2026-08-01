'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { Loader2, Check, X, ShieldCheck } from 'lucide-react';

type DeletionRequest = {
  id: string;
  email: string;
  full_name: string;
  deletion_reason: string | null;
  deletion_requested_at: string | null;
};

export default function AdminPage() {
  const checked = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!checked) return;
    if (!user?.is_superuser) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [checked, user?.is_superuser]);

  function load() {
    setLoading(true);
    api
      .get<DeletionRequest[]>('/admin/deletion-requests')
      .then(({ data }) => setRequests(data))
      .finally(() => setLoading(false));
  }

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.post(`/admin/deletion-requests/${id}/approve`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await api.post(`/admin/deletion-requests/${id}/reject`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  if (!checked || !user?.is_superuser) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
        <ShieldCheck size={22} className="text-primary" />
        Admin
      </h1>
      <p className="text-sm text-textmuted mb-6">Account deletion requests awaiting your review.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-textmuted text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading...
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card p-8 text-center text-textmuted text-sm">
          No pending deletion requests.
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {requests.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-textmain">{r.full_name}</p>
                  <p className="text-xs text-textmuted">{r.email}</p>
                  {r.deletion_requested_at && (
                    <p className="text-xs text-textmuted mt-1">
                      Requested {new Date(r.deletion_requested_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => reject(r.id)}
                    disabled={busyId === r.id}
                    title="Reject - keep the account"
                    className="btn-secondary h-9 w-9 !p-0 flex items-center justify-center"
                  >
                    {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                  </button>
                  <button
                    onClick={() => approve(r.id)}
                    disabled={busyId === r.id}
                    title="Approve - permanently delete"
                    className="rounded-lg bg-coral-500 text-white h-9 w-9 flex items-center justify-center hover:brightness-95 transition-all disabled:opacity-60"
                  >
                    {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  </button>
                </div>
              </div>
              {r.deletion_reason && (
                <p className="text-sm text-textmuted mt-3 bg-textmain/[0.03] rounded-lg px-3 py-2">
                  "{r.deletion_reason}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
