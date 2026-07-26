'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/navigation';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Send,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import { useAuthStore } from '@/lib/auth-store';
import { LanguageSwitcher } from './language-switcher';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/expenses', label: t('expenses'), icon: Receipt },
    { href: '/income', label: t('income'), icon: Wallet },
    { href: '/assistant', label: t('assistant'), icon: Sparkles },
    { href: '/settings', label: t('settings'), icon: SettingsIcon },
  ];

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-ink-950">
      <div className="flex">
        <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-ink-700/10 dark:border-cream-100/10 min-h-screen p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-9 w-9 rounded-xl bg-ink-900 dark:bg-gold-500 flex items-center justify-center">
              <span className="font-display font-bold text-gold-400 dark:text-ink-950">M</span>
            </div>
            <span className="font-display font-bold">MyIqtisod</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors bg-ink-900 text-cream-50 dark:bg-gold-500 dark:text-ink-950' : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-ink-700/70 dark:text-cream-100/70 hover:bg-ink-900/5 dark:hover:bg-cream-100/5'}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-coral-500 hover:bg-coral-500/10"
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </aside>

        <main className="flex-1 min-h-screen">
          <header className="flex items-center justify-between px-6 py-4 border-b border-ink-700/10 dark:border-cream-100/10">
            <div className="text-sm text-ink-700/60 dark:text-cream-100/60">
              {user?.full_name ? user.full_name : ''}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="btn-secondary p-2.5" aria-label="Toggle theme">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <LanguageSwitcher />
            </div>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>

      
        <a href="https://t.me/ibrohimmamatkarimov"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-[#229ED9] text-white px-4 py-3 shadow-glass hover:opacity-90 transition-opacity"
      >
        <Send size={18} />
        <span className="text-sm font-medium">Support</span>
      </a>
    </div>
  );
}
ENDOFFILE
