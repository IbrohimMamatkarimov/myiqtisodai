'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/navigation';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  Target,
  Moon,
  Sun,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from './theme-provider';
import { LanguageSwitcher } from './language-switcher';
import { NotificationsBell } from './NotificationsBell';
import { SupportChatWidget } from './SupportChatWidget';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const tb = useTranslations('topbar');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const regularNavItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/expenses', label: t('expenses'), icon: Receipt },
    { href: '/income', label: t('income'), icon: Wallet },
    { href: '/goals', label: t('goals'), icon: Target },
    { href: '/assistant', label: t('assistant'), icon: Sparkles },
    { href: '/settings', label: t('settings'), icon: SettingsIcon },
  ];

  // Admin accounts manage the platform, not their own personal finances - keep
  // their sidebar limited to that instead of mixing in Expenses/Income/Goals/AI.
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

  const hour = now?.getHours() ?? 9;
  const greeting = hour < 12 ? tb('morning') : hour < 18 ? tb('afternoon') : tb('evening');

  // The browser's own Intl date formatting has spotty/broken Uzbek locale data
  // (was rendering garbage like "M07 31, Fri"), so we format weekday/month
  // names ourselves instead of trusting toLocaleDateString for 'uz'.
  const WEEKDAYS: Record<string, string[]> = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    uz: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
  };
  const MONTHS: Record<string, string[]> = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  };
  const dateStr = now
    ? `${WEEKDAYS[locale]?.[now.getDay()] ?? WEEKDAYS.en[now.getDay()]}, ${now.getDate()} ${MONTHS[locale]?.[now.getMonth()] ?? MONTHS.en[now.getMonth()]}`
    : '';
  const firstName = user?.full_name?.split(' ')[0] || '';

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
                  src="/iqtisod-newphoto.png"
                  alt="IqtisodAI"
                  className="h-full w-full object-cover"
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-textmuted hover:bg-textmain/5 hover:text-textmain'
                  }`}
                >
                  <Icon size={17} />
                  {label}
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

        <main className="flex-1 min-h-screen">
          <header className="flex items-center justify-between gap-4 px-8 py-4 border-b border-textmain/[0.06]">
            <div className="flex items-center gap-4 min-w-0">
              <div className="shrink-0">
                <h1 className="font-display text-base font-semibold text-textmain flex items-center gap-1.5">
                  <span>{greeting}{firstName ? `, ${firstName}` : ''}</span>
                </h1>
                <p className="text-xs text-textmuted mt-0.5">{dateStr}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-textmain/10 text-textmuted hover:text-primary hover:border-primary/30 transition-colors"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <NotificationsBell />

              {!user?.is_superuser && (
                <Link
                  href="/assistant"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary text-white font-semibold text-sm px-3 py-2 hover:brightness-95 transition-all"
                >
                  <Sparkles size={14} />
                  {tb('askAI')}
                </Link>
              )}

              <LanguageSwitcher />
            </div>
          </header>
          <div className="p-8">{children}</div>
        </main>
      </div>

      {!user?.is_superuser && <SupportChatWidget />}
    </div>
  );
}
