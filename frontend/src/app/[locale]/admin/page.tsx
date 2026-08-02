'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  KeyRound,
  MessageSquare,
  Check,
  X as XIcon,
  X,
  Loader2,
  UserX,
  Pencil,
  Mail,
  RotateCcw,
  Megaphone,
  Users as UsersIcon,
  LayoutDashboard,
  Flag,
  Wallet,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_superuser: boolean;
  onboarding_completed: boolean;
  phone: string | null;
  last_login_at: string | null;
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

interface DashboardStats {
  total_users: number;
  active_users: number;
  ai_chats_today: number;
  total_expenses: number;
  total_incomes: number;
  reports_waiting: number;
  recent_activity: { kind: string; label: string; at: string }[];
}

interface AdminReport {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'solved';
  admin_reply: string | null;
  created_at: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-textmain/[0.03] rounded-lg p-2">
      <p className="text-textmuted text-xs">{label}</p>
      <p className="font-medium text-textmain truncate">{value ?? '—'}</p>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-textmuted text-xs mb-2">
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl font-bold text-textmain tabular-nums">{value}</p>
    </div>
  );
}

type Tab = 'dashboard' | 'users' | 'reports';

export default function AdminPage() {
  const checked = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>('dashboard');

  // Dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Deletion requests
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [deletionLoading, setDeletionLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');

  // Reports
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<'open' | 'solved' | 'all'>('open');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  function openChat(userId: string) {
    router.push(`/admin/chat?user=${userId}`);
  }

  function loadStats() {
    setStatsLoading(true);
    api.get<DashboardStats>('/admin/dashboard').then(({ data }) => setStats(data)).finally(() => setStatsLoading(false));
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

  function loadReports(status: 'open' | 'solved' | 'all') {
    setReportsLoading(true);
    api
      .get<AdminReport[]>('/admin/reports', { params: status === 'all' ? {} : { status } })
      .then(({ data }) => setReports(data))
      .finally(() => setReportsLoading(false));
  }

  useEffect(() => {
    if (!checked) return;
    if (user && !user.is_superuser) {
      router.push('/dashboard');
      return;
    }
    if (user?.is_superuser) {
      loadStats();
      loadUsers();
      loadDeletionRequests();
      loadReports(reportFilter);
    }
  }, [checked, user]);

  useEffect(() => {
    if (user?.is_superuser && tab === 'reports') loadReports(reportFilter);
  }, [reportFilter]);

  if (!checked || !user?.is_superuser) return null;

  function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    setEditing(false);
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

  function startEdit() {
    if (!detail) return;
    setEditForm({
      full_name: detail.full_name || '',
      phone: detail.phone || '',
      country: detail.country || '',
      occupation: detail.occupation || '',
      age: detail.age?.toString() || '',
      monthly_income: detail.monthly_income?.toString() || '',
      salary_day: detail.salary_day?.toString() || '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!detail) return;
    setBusy(true);
    try {
      const payload: Record<string, string | number | undefined> = {
        full_name: editForm.full_name || undefined,
        phone: editForm.phone || undefined,
        country: editForm.country || undefined,
        occupation: editForm.occupation || undefined,
        age: editForm.age ? Number(editForm.age) : undefined,
        monthly_income: editForm.monthly_income ? Number(editForm.monthly_income) : undefined,
        salary_day: editForm.salary_day ? Number(editForm.salary_day) : undefined,
      };
      await api.patch(`/admin/users/${detail.id}`, payload);
      setEditing(false);
      openDetail(detail.id);
      loadUsers(search);
    } finally {
      setBusy(false);
    }
  }

  async function submitEmailChange() {
    if (!emailFor || !newEmail.includes('@')) return;
    setBusy(true);
    try {
      await api.post(`/admin/users/${emailFor}/change-email`, { new_email: newEmail });
      setEmailFor(null);
      setNewEmail('');
      loadUsers(search);
      if (detail?.id === emailFor) openDetail(emailFor);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Could not change email.');
    } finally {
      setBusy(false);
    }
  }

  async function resetOnboarding(id: string) {
    if (!confirm("Reset this user's onboarding? They'll see the setup wizard again next login. Their data stays intact.")) return;
    setBusy(true);
    try {
      await api.post(`/admin/users/${id}/reset-onboarding`);
      loadUsers(search);
      if (detail?.id === id) openDetail(id);
    } finally {
      setBusy(false);
    }
  }

  async function sendBroadcast() {
    if (!broadcastTitle || !broadcastMessage) return;
    setBusy(true);
    try {
      await api.post('/admin/notify-all', { title: broadcastTitle, message: broadcastMessage });
      setBroadcastOpen(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      alert('Sent to all active users.');
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(reportId: string) {
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/reports/${reportId}/reply`, { reply: replyText });
      setReplyingId(null);
      setReplyText('');
      loadReports(reportFilter);
      loadStats();
    } finally {
      setBusy(false);
    }
  }

  async function solveReport(reportId: string) {
    setBusy(true);
    try {
      await api.post(`/admin/reports/${reportId}/solve`);
      loadReports(reportFilter);
      loadStats();
    } finally {
      setBusy(false);
    }
  }

  async function deleteReport(reportId: string) {
    if (!confirm('Delete this report permanently?')) return;
    setBusy(true);
    try {
      await api.delete(`/admin/reports/${reportId}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      loadStats();
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'users', label: 'Users', icon: <UsersIcon size={15} /> },
    { id: 'reports', label: 'Reports', icon: <Flag size={15} /> },
  ];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain">Admin</h1>
        <div className="flex items-center gap-1 rounded-xl border border-textmain/10 bg-surface p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary text-white' : 'text-textmuted hover:text-textmain'
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === 'reports' && stats && stats.reports_waiting > 0 && (
                <span className={`text-[10px] rounded-full px-1.5 ${tab === t.id ? 'bg-white/20' : 'bg-danger/10 text-danger'}`}>
                  {stats.reports_waiting}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------- Dashboard -------------------- */}
      {tab === 'dashboard' && (
        <div>
          {statsLoading || !stats ? (
            <div className="p-8 text-center text-sm text-textmuted">
              <Loader2 className="animate-spin mx-auto" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <StatCard label="Total users" value={stats.total_users} icon={<UsersIcon size={14} />} />
                <StatCard label="Active users" value={stats.active_users} icon={<ShieldCheck size={14} />} />
                <StatCard label="AI chats today" value={stats.ai_chats_today} icon={<Sparkles size={14} />} />
                <StatCard label="Total expenses" value={stats.total_expenses.toLocaleString()} icon={<Receipt size={14} />} />
                <StatCard label="Total income" value={stats.total_incomes.toLocaleString()} icon={<Wallet size={14} />} />
                <StatCard label="Reports waiting" value={stats.reports_waiting} icon={<Flag size={14} />} />
              </div>

              <div className="glass-card p-5">
                <h2 className="font-display font-semibold text-textmain mb-3">Recent activity</h2>
                {stats.recent_activity.length === 0 ? (
                  <p className="text-sm text-textmuted">Nothing yet.</p>
                ) : (
                  <div className="divide-y divide-textmain/[0.06]">
                    {stats.recent_activity.map((a, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between text-sm">
                        <span className="text-textmain">{a.label}</span>
                        <span className="text-textmuted text-xs">{new Date(a.at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------- Users -------------------- */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
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
            <button onClick={() => setBroadcastOpen(true)} className="btn-secondary text-sm">
              <Megaphone size={15} />
              Notify all users
            </button>
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
                        <button onClick={() => openChat(r.id)} className="btn-secondary text-xs px-2 py-1.5" title="Chat with this user">
                          <MessageSquare size={14} />
                        </button>
                        <button disabled={busy} onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)} className="btn-secondary text-xs px-2 py-1.5">
                          <XIcon size={14} />
                          Reject
                        </button>
                        <button disabled={busy} onClick={() => approveDeletion(r.id, r.email)} className="text-xs px-2 py-1.5 rounded-lg bg-danger text-white font-semibold hover:brightness-95 flex items-center gap-1">
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
                    <th className="px-5 py-3 font-medium text-textmuted">Last login</th>
                    <th className="px-5 py-3 font-medium text-textmuted">Joined</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-textmain/[0.06] last:border-0 hover:bg-textmain/[0.02]">
                      <td className="px-5 py-3 text-textmain cursor-pointer" onClick={() => openDetail(u.id)}>
                        {u.email}
                        {u.is_superuser && <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">ADMIN</span>}
                        {u.deletion_requested && <span className="ml-2 text-[10px] font-semibold text-danger bg-danger/10 rounded px-1.5 py-0.5">DELETE REQUESTED</span>}
                      </td>
                      <td className="px-5 py-3 text-textmain">{u.full_name}</td>
                      <td className="px-5 py-3">
                        <span className={u.is_active ? 'text-secondary' : 'text-danger'}>{u.is_active ? 'Active' : 'Disabled'}</span>
                      </td>
                      <td className="px-5 py-3 text-textmuted">{u.onboarding_completed ? 'Yes' : 'No'}</td>
                      <td className="px-5 py-3 text-textmuted">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3 text-textmuted">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button title="Chat with user" onClick={() => openChat(u.id)} className="text-textmuted hover:text-primary">
                            <MessageSquare size={15} />
                          </button>
                          <button title={u.is_active ? 'Deactivate' : 'Reactivate'} disabled={busy || u.id === user.id} onClick={() => toggleActive(u.id)} className="text-textmuted hover:text-primary disabled:opacity-30">
                            {u.is_active ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                          </button>
                          <button title="Set new password" onClick={() => setPasswordFor(u.id)} className="text-textmuted hover:text-primary">
                            <KeyRound size={15} />
                          </button>
                          <button title="Delete user" disabled={busy || u.id === user.id} onClick={() => deleteUser(u.id, u.email)} className="text-textmuted hover:text-danger disabled:opacity-30">
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
        </div>
      )}

      {/* -------------------- Reports -------------------- */}
      {tab === 'reports' && (
        <div>
          <div className="flex items-center gap-1 rounded-xl border border-textmain/10 bg-surface p-1 mb-4 w-fit">
            {(['open', 'solved', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReportFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  reportFilter === f ? 'bg-primary text-white' : 'text-textmuted hover:text-textmain'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {reportsLoading ? (
            <div className="p-8 text-center text-sm text-textmuted"><Loader2 className="animate-spin mx-auto" /></div>
          ) : reports.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-textmuted">No {reportFilter !== 'all' ? reportFilter : ''} reports.</div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-textmain">{r.subject}</p>
                        <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${r.status === 'open' ? 'text-amber-600 bg-amber-500/10' : 'text-secondary bg-secondary/10'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-textmuted mt-0.5">{r.user_full_name} — {r.user_email} · {new Date(r.created_at).toLocaleString()}</p>
                      <p className="text-sm text-textmain mt-2">{r.message}</p>
                      {r.admin_reply && (
                        <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-2 text-sm">
                          <p className="text-xs font-semibold text-primary mb-0.5">Your reply</p>
                          <p className="text-textmain">{r.admin_reply}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openChat(r.user_id)} title="Chat with user" className="text-textmuted hover:text-primary">
                        <MessageSquare size={15} />
                      </button>
                      {r.status === 'open' && (
                        <button onClick={() => solveReport(r.id)} title="Mark solved" className="text-textmuted hover:text-secondary">
                          <Check size={15} />
                        </button>
                      )}
                      <button onClick={() => deleteReport(r.id)} title="Delete" className="text-textmuted hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {replyingId === r.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply (also marks as solved)..."
                        className="input-field flex-1 text-sm"
                      />
                      <button disabled={busy} onClick={() => submitReply(r.id)} className="btn-primary text-sm shrink-0">
                        {busy ? <Loader2 size={14} className="animate-spin" /> : 'Send'}
                      </button>
                      <button onClick={() => setReplyingId(null)} className="btn-secondary text-sm shrink-0">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyingId(r.id); setReplyText(''); }} className="btn-secondary text-xs mt-3">
                      Reply
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setDetail(null)}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : editing ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-textmain">Edit profile</h2>
                  <button onClick={() => setEditing(false)} className="text-textmuted hover:text-textmain"><X size={18} /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label-text">Full name</label>
                    <input className="input-field mt-1" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-text">Phone</label>
                      <input className="input-field mt-1" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-text">Age</label>
                      <input type="number" className="input-field mt-1" value={editForm.age} onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-text">Country</label>
                      <input className="input-field mt-1" value={editForm.country} onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-text">Occupation</label>
                      <input className="input-field mt-1" value={editForm.occupation} onChange={(e) => setEditForm((f) => ({ ...f, occupation: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-text">Monthly income</label>
                      <input type="number" className="input-field mt-1" value={editForm.monthly_income} onChange={(e) => setEditForm((f) => ({ ...f, monthly_income: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-text">Salary day</label>
                      <input type="number" min={1} max={31} className="input-field mt-1" value={editForm.salary_day} onChange={(e) => setEditForm((f) => ({ ...f, salary_day: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                  <button onClick={saveEdit} disabled={busy} className="btn-primary">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : 'Save changes'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display font-semibold text-textmain">{detail.full_name}</h2>
                    <p className="text-sm text-textmuted">{detail.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={startEdit} title="Edit profile" className="text-textmuted hover:text-primary p-1">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => { setEmailFor(detail.id); setNewEmail(detail.email); }} title="Change email" className="text-textmuted hover:text-primary p-1">
                      <Mail size={16} />
                    </button>
                    <button onClick={() => resetOnboarding(detail.id)} title="Reset onboarding" className="text-textmuted hover:text-primary p-1">
                      <RotateCcw size={16} />
                    </button>
                    <button onClick={() => setDetail(null)} className="text-textmuted hover:text-textmain p-1">
                      <X size={18} />
                    </button>
                  </div>
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
                  <InfoRow label="Phone" value={detail.phone} />
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
                  <InfoRow label="Last login" value={detail.last_login_at ? new Date(detail.last_login_at).toLocaleString() : 'Never'} />
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
                      <button disabled={busy} onClick={() => { setRejectingId(detail.id); setDetail(null); }} className="btn-secondary text-xs px-2 py-1.5">
                        Reject request
                      </button>
                      <button disabled={busy} onClick={() => approveDeletion(detail.id, detail.email)} className="text-xs px-2 py-1.5 rounded-lg bg-danger text-white font-semibold hover:brightness-95">
                        Approve delete
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => openChat(detail.id)} className="btn-secondary text-sm mt-4 w-full">
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
              This immediately overwrites their password. You'll need to relay it to them yourself.
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

      {/* Change email modal */}
      {emailFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setEmailFor(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold text-textmain mb-4">Change email</h2>
            <input
              type="email"
              autoFocus
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="input-field"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEmailFor(null)} className="btn-secondary">Cancel</button>
              <button onClick={submitEmailChange} disabled={busy || !newEmail.includes('@')} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" /> : 'Update email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setBroadcastOpen(false)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold text-textmain mb-1">Notify all users</h2>
            <p className="text-xs text-textmuted mb-4">Sends to every active user's notification bell.</p>
            <div className="space-y-3">
              <input
                autoFocus
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Title"
                className="input-field"
              />
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Message"
                rows={3}
                className="input-field resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setBroadcastOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={sendBroadcast} disabled={busy || !broadcastTitle || !broadcastMessage} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" /> : 'Send to everyone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
