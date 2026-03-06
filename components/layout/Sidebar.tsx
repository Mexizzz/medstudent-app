'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BookOpen, Brain, BarChart2, CalendarDays, Stethoscope, XCircle, GraduationCap, Lightbulb, Target, FlaskConical, NotebookPen, Users, Flame, LogOut, User, Menu, X, UserPlus, MessageCircle, Sun, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { XpProgress } from '@/lib/xp';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/library',       label: 'Library',        icon: BookOpen },
  { href: '/study',         label: 'Study',          icon: Brain },
  { href: '/tutor',         label: 'AI Tutor',       icon: GraduationCap },
  { href: '/lessons',       label: 'Lessons',        icon: Lightbulb },
  { href: '/exam',          label: 'Exam Mode',      icon: GraduationCap },
  { href: '/wrong-answers', label: 'Wrong Answers',  icon: XCircle },
  { href: '/analytics',     label: 'Analytics',      icon: BarChart2 },
  { href: '/study-plan',    label: 'Study Plan',     icon: CalendarDays },
  { href: '/goals',          label: 'Goals',          icon: Target },
  { href: '/exam-lab',       label: 'Exam Lab',       icon: FlaskConical },
  { href: '/summaries',      label: 'Summaries',      icon: NotebookPen },
  { href: '/study-rooms',    label: 'Study Rooms',    icon: Users },
  { href: '/friends',         label: 'Friends',        icon: UserPlus },
  { href: '/chat',            label: 'Messages',       icon: MessageCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [xp, setXp] = useState<XpProgress | null>(null);
  const [streak, setStreak] = useState<{ currentStreak: number; todayComplete: boolean } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch('/api/xp').then(r => r.json()).then(setXp).catch(() => {});
    fetch('/api/streak').then(r => r.json()).then(setStreak).catch(() => {});
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const sidebarContent = (
    <>
      {/* Logo + streak */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <Stethoscope className="w-5 h-5 text-blue-300" />
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">MedStudy</span>
        </div>
        <div className="flex items-center gap-2">
          {streak && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold',
              streak.todayComplete ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white/40'
            )}>
              <Flame className="w-3 h-3" />
              {streak.currentStreak}
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-white/10 text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Med Rank + User */}
      <div className="px-4 py-3 border-t border-sidebar-border space-y-3">
        {xp && (
          <Link href="/dashboard" className="block group">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{xp.rank.badge}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate">{xp.rank.title}</p>
                <p className="text-[10px] text-sidebar-foreground/40">Lv.{xp.rank.level} · {xp.totalXp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-400 rounded-full transition-all"
                style={{ width: `${xp.percent}%` }}
              />
            </div>
          </Link>
        )}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark-neon' : 'light')}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-white/10 hover:text-white transition-colors"
          title={theme === 'light' ? 'Switch to Dark Neon' : 'Switch to Light'}
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          {theme === 'light' ? 'Dark Neon' : 'Light Mode'}
        </button>
        {user && (
          <div className="flex items-center justify-between">
            <Link href="/profile" className="flex items-center gap-2 min-w-0 group">
              <User className="w-3.5 h-3.5 text-sidebar-foreground/50 flex-shrink-0 group-hover:text-white" />
              <span className="text-xs text-sidebar-foreground/60 truncate group-hover:text-white transition-colors">{user.name || user.email}</span>
            </Link>
            <button onClick={handleLogout} className="p-1 rounded hover:bg-white/10 text-sidebar-foreground/40 hover:text-white transition-colors" title="Log out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 flex items-center px-4 gap-3 border-b border-border bg-background">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">MedStudy</span>
        </div>
        {streak && (
          <div className={cn(
            'ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold',
            streak.todayComplete ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300' : 'bg-muted text-muted-foreground'
          )}>
            <Flame className="w-3 h-3" />
            {streak.currentStreak}
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: fixed left, mobile: slide-in drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-56 flex flex-col z-50 transition-transform duration-200',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--sidebar)' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
