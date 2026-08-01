'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Search, ShieldCheck, ShieldOff, Trash2, KeyRound, MessageSquare, Check, X as XIcon, X, Loader2, UserX } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_superuser: boolean;
  onboarding_completed: boolean;
  currency: string;
  language: string;
  financial_goal: string | null;
  age: number | null;
  gender: string | null;
  country: string | null;
  occupation: string | null;
  monthly_income: number | null;
  salary_day: number | null;
  spending_habits: Record<string, number> | null;
  notifications_enabled: boolean;
  theme: string;
  deletion_requested: boolean;
  deletion_reason: string | null;
  deletion_requested_at: string | null;
  created_at: string;
}

interface AdminUserDetail extends AdminUser {
  total_income: number;
  total_expenses: number;
  expense_count: number;
  income_count: number;
  goal_count: number;
}

interface DeletionRequest {
  id: string;
  email: string;
  full_name: string;
  deletion_reason: string | null;
  deletion_requested_at: string | null;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-textmain/[0.03] rounded-lg p-2">
      <p className="text-textmuted text-xs">{label}</p>
      <p className="font-medium text-textmain truncate">{value ?? '—'}</p>
    </div>
  );
}

export default function AdminPage() {
  const checked = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Deletion requests
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [deletionLoading, setDeletionLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');

  function openChat(userId: string) {
    router.push(`/admin/chat?user=${userId}`);
  }

  function loadUsers(q?: string) {
    setLoading(true);
    api
      .get<AdminUser[]>('/admin/users', { params: q ? { search: q } : {} })
      .then(({ data }) => setUsers(data))
      .finally(() => setLoading(false));
  }

  function loadDeletionRequests() {
    setDeletionLoading(true);
    api
      .get<DeletionRequest[]>('/admin/deletion-requests')
      .then(({ data }) => setDeletionRequests(data))
      .finally(() => setDeletionLoading(false));
  }

  useEffect(() => {
    if (!checked) return;
    if (user && !user.is_superuser) {
      router.push('/dashboard');
      return;
    }
    if (user?.is_superuser) {
      loadUsers();
      loadDeletionRequests();
    }
  }, [checked, user]);

  if (!checked || !user?.is_superuser) return null;

  function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    api.get<AdminUserDetail>(`/admin/users/${id}`).then(({ data }) => setDetail(data)).finally(() => setDetailLoading(false));
  }

  async function toggleActive(id: string) {
    setBusy(true);
    try {
      await api.post(`/admin/users/${id}/toggle-active`);
      loadUsers(search);
      if (detail?.id === id) openDetail(id);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Permanently delete ${email} and all their data? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeletionRequests((prev) => prev.filter((r) => r.id !== id));
      if (detail?.id === id) setDetail(null);
    } finally {
      setBusy(false);
    }
  }

  async function approveDeletion(id: string, email: string) {
    if (!confirm(`Approve deletion for ${email}? This permanently deletes their account and all data.`)) return;
    setBusy(true);
    try {
      await api.post(`/admin/deletion-requests/${id}/approve`);
      setDeletionRequests((prev) => prev.filter((r) => r.id !== id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (detail?.id === id) setDetail(null);
    } finally {
      setBusy(false);
    }
  }

  async function rejectDeletion(id: string) {
    setBusy(true);
    try {
      await api.post(`/admin/deletion-requests/${id}/reject`, { message: rejectMessage || undefined });
      setDeletionRequests((prev) => prev.filter((r) => r.id !== id));
      loadUsers(search);
      if (detail?.id === id) openDetail(id);
      setRejectingId(null);
      setRejectMessage('');
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    if (!passwordFor || newPassword.length < 8) return;
    setBusy(true);
    try {
      await api.post(`/admin/users/${passwordFor}/reset-password`, { new_password: newPassword });
      setPasswordFor(null);
      setNewPassword('');
      alert('Password updated. Relay the new password to the user directly.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">Admin — Users</h1>
        <div className="flex items-center gap-2 rounded-xl border border-textmain/10 bg-surface px-3 py-2 text-sm w-64">
          <Search size={15} className="text-textmuted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers(search)}
            placeholder="Search email or name..."
            className="bg-transparent outline-none w-full text-textmain placeholder:text-textmuted"
          />
        </div>
      </div>

      {/* Deletion requests */}
      {!deletionLoading && deletionRequests.length > 0 && (
        <div className="glass-card overflow-hidden mb-6 border border-danger/30">
          <div className="px-5 py-3 border-b border-danger/20 bg-danger/5 flex items-center gap-2">
            <UserX size={16} className="text-danger" />
            <h2 className="font-display font-semibold text-danger">
              Pending account deletion requests ({deletionRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-textmain/[0.06]">
            {deletionRequests.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-textmain truncate">{r.full_name} <span className="text-textmuted font-normal">— {r.email}</span></p>
                    {r.deletion_reason && (
                      <p className="text-sm text-textmuted mt-1">"{r.deletion_reason}"</p>
                    )}
                    {r.deletion_requested_at && (
                      <p className="text-xs text-textmuted mt-1">{new Date(r.deletion_requested_at).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openChat(r.id)}
                      className="btn-secondary text-xs px-2 py-1.5"
                      title="Chat with this user"
                    >
                      <MessageSquare size={14} />
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}
                      className="btn-secondary text-xs px-2 py-1.5"
                    >
                      <XIcon size={14} />
                      Reject
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => approveDeletion(r.id, r.email)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-danger text-white font-semibold hover:brightness-95 flex items-center gap-1"
                    >
                      <Check size={14} />
                      Approve delete
                    </button>
                  </div>
                </div>

                {rejectingId === r.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      value={rejectMessage}
                      onChange={(e) => setRejectMessage(e.target.value)}
                      placeholder="Optional message to send explaining why (goes to their notifications)"
                      className="input-field flex-1 text-sm"
                    />
                    <button disabled={busy} onClick={() => rejectDeletion(r.id)} className="btn-primary text-sm shrink-0">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : 'Send & reject'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-textmuted">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-textmuted">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-textmain/[0.06] text-left">
                <th className="px-5 py-3 font-medium text-textmuted">Email</th>
                <th className="px-5 py-3 font-medium text-textmuted">Name</th>
                <th className="px-5 py-3 font-medium text-textmuted">Status</th>
                <th className="px-5 py-3 font-medium text-textmuted">Onboarded</th>
                <th className="px-5 py-3 font-medium text-textmuted">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-textmain/[0.06] last:border-0 hover:bg-textmain/[0.02]">
                  <td className="px-5 py-3 text-textmain cursor-pointer" onClick={() => openDetail(u.id)}>
                    {u.email}
                    {u.is_superuser && (
                      <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">ADMIN</span>
                    )}
                    {u.deletion_requested && (
                      <span className="ml-2 text-[10px] font-semibold text-danger bg-danger/10 rounded px-1.5 py-0.5">DELETE REQUESTED</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-textmain">{u.full_name}</td>
                  <td className="px-5 py-3">
                    <span className={u.is_active ? 'text-secondary' : 'text-danger'}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-textmuted">{u.onboarding_completed ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-3 text-textmuted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="Chat with user"
                        onClick={() => openChat(u.id)}
                        className="text-textmuted hover:text-primary"
                      >
                        <MessageSquare size={15} />
                      </button>
                      <button
                        title={u.is_active ? 'Deactivate' : 'Reactivate'}
                        disabled={busy || u.id === user.id}
                        onClick={() => toggleActive(u.id)}
                        className="text-textmuted hover:text-primary disabled:opacity-30"
                      >
                        {u.is_active ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                      </button>
                      <button
                        title="Set new password"
                        onClick={() => setPasswordFor(u.id)}
                        className="text-textmuted hover:text-primary"
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        title="Delete user"
                        disabled={busy || u.id === user.id}
                        onClick={() => deleteUser(u.id, u.email)}
                        className="text-textmuted hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setDetail(null)}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display font-semibold text-textmain">{detail.full_name}</h2>
                    <p className="text-sm text-textmuted">{detail.email}</p>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-textmuted hover:text-textmain">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-textmain/[0.03] rounded-lg p-3">
                    <p className="text-textmuted text-xs">Total income</p>
                    <p className="font-semibold text-textmain tabular-nums">{detail.total_income.toLocaleString()} {detail.currency}</p>
                  </div>
                  <div className="bg-textmain/[0.03] rounded-lg p-3">
                    <p className="text-textmuted text-xs">Total expenses</p>
                    <p className="font-semibold text-textmain tabular-nums">{detail.total_expenses.toLocaleString()} {detail.currency}</p>
                  </div>
                  <div className="bg-textmain/[0.03] rounded-lg p-3">
                    <p className="text-textmuted text-xs">Expenses logged</p>
                    <p className="font-semibold text-textmain">{detail.expense_count}</p>
                  </div>
                  <div className="bg-textmain/[0.03] rounded-lg p-3">
                    <p className="text-textmuted text-xs">Incomes logged</p>
                    <p className="font-semibold text-textmain">{detail.income_count}</p>
                  </div>
                  <div className="bg-textmain/[0.03] rounded-lg p-3">
                    <p className="text-textmuted text-xs">Goals</p>
                    <p className="font-semibold text-textmain">{detail.goal_count}</p>
                  </div>
                  <div className="bg-textmain/[0.03] rounded-lg p-3">
                    <p className="text-textmuted text-xs">Account status</p>
                    <p className={`font-semibold ${detail.is_active ? 'text-secondary' : 'text-danger'}`}>{detail.is_active ? 'Active' : 'Disabled'}</p>
                  </div>
                </div>

                <h3 className="text-xs font-semibold uppercase tracking-wide text-textmuted mb-2">Profile & onboarding</h3>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <InfoRow label="Age" value={detail.age} />
                  <InfoRow label="Gender" value={detail.gender} />
                  <InfoRow label="Country" value={detail.country} />
                  <InfoRow label="Occupation" value={detail.occupation} />
                  <InfoRow label="Reported monthly income" value={detail.monthly_income?.toLocaleString()} />
                  <InfoRow label="Salary day" value={detail.salary_day} />
                  <InfoRow label="Financial goal" value={detail.financial_goal} />
                  <InfoRow label="Currency" value={detail.currency} />
                  <InfoRow label="Language" value={detail.language} />
                  <InfoRow label="Onboarding" value={detail.onboarding_completed ? 'Completed' : 'Not finished'} />
                  <InfoRow label="Email verified" value={detail.is_email_verified ? 'Yes' : 'No'} />
                  <InfoRow label="Notifications" value={detail.notifications_enabled ? 'On' : 'Off'} />
                  <InfoRow label="Joined" value={new Date(detail.created_at).toLocaleString()} />
                </div>

                {detail.spending_habits && Object.values(detail.spending_habits).some((v) => v) && (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-textmuted mb-2">Self-reported spending habits</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                      {Object.entries(detail.spending_habits)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k} className="bg-textmain/[0.03] rounded-lg p-2">
                            <p className="text-textmuted text-xs capitalize">{k}</p>
                            <p className="font-medium text-textmain tabular-nums">{v.toLocaleString()}</p>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                {detail.deletion_requested && (
                  <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm">
                    <p className="font-semibold text-danger">Requested account deletion</p>
                    {detail.deletion_reason && <p className="text-textmuted mt-1">"{detail.deletion_reason}"</p>}
                    {detail.deletion_requested_at && (
                      <p className="text-textmuted text-xs mt-1">{new Date(detail.deletion_requested_at).toLocaleString()}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        disabled={busy}
                        onClick={() => { setRejectingId(detail.id); setDetail(null); }}
                        className="btn-secondary text-xs px-2 py-1.5"
                      >
                        Reject request
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => approveDeletion(detail.id, detail.email)}
                        className="text-xs px-2 py-1.5 rounded-lg bg-danger text-white font-semibold hover:brightness-95"
                      >
                        Approve delete
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openChat(detail.id)}
                  className="btn-secondary text-sm mt-4 w-full"
                >
                  <MessageSquare size={15} />
                  Chat with this user
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Set password modal */}
      {passwordFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setPasswordFor(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold text-textmain mb-1">Set new password</h2>
            <p className="text-xs text-textmuted mb-4">
              This immediately overwrites their password. You'll need to relay it to them yourself (SMTP isn't configured for automatic emails yet).
            </p>
            <input
              type="text"
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input-field"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPasswordFor(null)} className="btn-secondary">Cancel</button>
              <button onClick={submitPassword} disabled={busy || newPassword.length < 8} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" /> : 'Set password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
