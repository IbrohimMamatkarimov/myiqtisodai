'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  BookUser,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { LanguageSwitcher } from './language-switcher';
import { NotificationsBell } from './NotificationsBell';
import { GlobalSearch } from './GlobalSearch';
import { SupportChatWidget } from './SupportChatWidget';
import { api } from '@/lib/api-client';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  // Admins get a red badge on the Chat nav item whenever a user has an
  // unreplied message waiting - same idea as the user-facing chat badge.
  const [adminChatUnread, setAdminChatUnread] = useState(0);
  useEffect(() => {
    if (!user?.is_superuser) return;
    function loadUnread() {
      api
        .get<{ unread_count: number }[]>('/admin/chat/conversations')
        .then(({ data }) => setAdminChatUnread(data.reduce((sum, c: any) => sum + (c.unread_count || 0), 0)))
        .catch(() => {});
    }
    loadUnread();
    const interval = setInterval(loadUnread, 12000);
    return () => clearInterval(interval);
  }, [user?.is_superuser]);

  const regularNavItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/transactions', label: t('transactions'), icon: ArrowLeftRight },
    { href: '/goals', label: t('goals'), icon: Target },
    { href: '/debts', label: t('debts'), icon: BookUser },
    { href: '/assistant', label: t('assistant'), icon: Sparkles },
    { href: '/settings', label: t('settings'), icon: SettingsIcon },
  ];

  // Admin accounts manage the platform, not their own personal finances - keep
  // their sidebar limited to that instead of mixing in the personal-finance nav.
  const navItems = user?.is_superuser
    ? [
        { href: '/admin', label: 'Admin', icon: ShieldCheck },
        { href: '/admin/chat', label: 'Chat', icon: MessageCircle },
        { href: '/settings', label: t('settings'), icon: SettingsIcon },
      ]
    : regularNavItems;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-textmain/[0.06] min-h-screen p-5 relative">
          <Link
            href={user?.is_superuser ? '/admin' : '/dashboard'}
            onClick={() => router.refresh()}
            className="flex items-center gap-2 mb-8 px-1 justify-between"
          >
            <span className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/iqtisodaiphoto.jpg"
                  alt="IqtisodAI"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <span className="font-display font-semibold text-textmain">IqtisodAI</span>
            </span>
          </Link>

          <nav className="flex-1 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                    active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-textmuted hover:bg-textmain/5 hover:text-textmain'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                  {href === '/admin/chat' && adminChatUnread > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1">
                      {adminChatUnread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-textmuted hover:bg-danger/10 hover:text-danger transition-colors"
          >
            <LogOut size={17} />
            {t('logout')}
          </button>
        </aside>

        <main className="flex-1 min-h-screen pb-16 md:pb-0">
          <header className="flex items-center justify-between gap-3 px-4 md:px-8 py-4 border-b border-textmain/[0.06]">
            <div className="min-w-0 flex-1">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <NotificationsBell />

              <LanguageSwitcher />

              <Link
                href="/settings"
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-textmain/5 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {initials}
                </div>
                <span className="hidden lg:block text-left">
                  <span className="block text-sm font-medium text-textmain leading-tight truncate max-w-[9rem]">
                    {user?.full_name || user?.email}
                  </span>
                </span>
                <ChevronDown size={14} className="hidden lg:block text-textmuted" />
              </Link>
            </div>
          </header>
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav - horizontal, only shown below md breakpoint */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around border-t border-textmain/[0.08] bg-surface overflow-x-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] relative min-w-[3.5rem] ${
                active ? 'text-primary font-semibold' : 'text-textmuted'
              }`}
            >
              <Icon size={18} />
              <span className="truncate max-w-full px-1">{label}</span>
              {href === '/admin/chat' && adminChatUnread > 0 && (
                <span className="absolute top-1 right-1/4 h-2 w-2 rounded-full bg-danger" />
              )}
            </Link>
          );
        })}
      </nav>

      {!user?.is_superuser && <SupportChatWidget />}
    </div>
  );
}
