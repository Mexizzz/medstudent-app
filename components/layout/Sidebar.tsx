'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BookOpen, Brain, BarChart2, CalendarDays, XCircle, GraduationCap, Lightbulb, Target, FlaskConical, NotebookPen, Users, Flame, LogOut, User, Menu, X, UserPlus, MessageCircle, FolderOpen, Crown, HelpCircle, Gauge, Trophy, TrendingUp, Palette, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { XpProgress } from '@/lib/xp';
import { useTheme, THEMES } from '@/components/ThemeProvider';
import type { Theme } from '@/components/ThemeProvider';
import { TierBadge } from '@/components/ui/TierBadge';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { title?: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
    ],
  },
  {
    title: 'Learn',
    items: [
      { href: '/library',       label: 'Library',        icon: BookOpen },
      { href: '/study',         label: 'Study',          icon: Brain },
      { href: '/tutor',         label: 'AI Tutor',       icon: GraduationCap },
      { href: '/lessons',       label: 'Lessons',        icon: Lightbulb },
      { href: '/summaries',     label: 'Summaries',      icon: NotebookPen },
      { href: '/folders',       label: 'Folders',        icon: FolderOpen },
    ],
  },
  {
    title: 'Test',
    items: [
      { href: '/exam',          label: 'Exam Mode',      icon: GraduationCap },
      { href: '/exam-lab',      label: 'Exam Lab',       icon: FlaskConical },
      { href: '/wrong-answers', label: 'Wrong Answers',  icon: XCircle },
    ],
  },
  {
    title: 'Track',
    items: [
      { href: '/analytics',     label: 'Analytics',      icon: BarChart2 },
      { href: '/study-plan',    label: 'Study Plan',     icon: CalendarDays },
      { href: '/goals',         label: 'Goals',          icon: Target },
      { href: '/insights',      label: 'Weekly Insights', icon: TrendingUp },
      { href: '/leaderboard',   label: 'Leaderboard',    icon: Trophy },
    ],
  },
  {
    title: 'Social',
    items: [
      { href: '/study-rooms',   label: 'Study Rooms',    icon: Users },
      { href: '/friends',       label: 'Friends',        icon: UserPlus },
      { href: '/chat',          label: 'Messages',       icon: MessageCircle },
    ],
  },
  {
    items: [
      { href: '/usage',         label: 'Usage & Limits', icon: Gauge },
      { href: '/requests',      label: 'Requests',       icon: Lightbulb },
      { href: '/support',       label: 'Support',        icon: HelpCircle },
      { href: '/pricing',       label: 'Upgrade Plan',   icon: Crown },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [xp, setXp] = useState<XpProgress | null>(null);
  const [streak, setStreak] = useState<{ currentStreak: number; todayComplete: boolean } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string; subscriptionTier?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch('/api/sidebar')
      .then(r => r.json())
      .then(d => {
        if (d.xp) setXp(d.xp);
        if (d.streak) setStreak(d.streak);
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const sidebarContent = (
    <>
      {/* Logo + streak */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)' }}
          >
            M
          </div>
          <span className="font-bold text-white text-lg tracking-tight">MedStudy</span>
        </div>
        <div className="flex items-center gap-2">
          {streak && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all',
              streak.todayComplete
                ? 'bg-orange-500/25 text-orange-300 ring-1 ring-orange-500/30'
                : 'bg-white/8 text-white/40'
            )}>
              <Flame className={cn('w-3 h-3', streak.todayComplete && 'animate-pulse')} />
              {streak.currentStreak}
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-white/10 text-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto scrollbar-thin">
        {navSections.map((section, i) => (
          <div key={i} className={i > 0 ? 'mt-5' : ''}>
            {section.title && (
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isUpgradeLink = href === '/pricing';
                const userTier = user?.subscriptionTier || 'free';
                let displayLabel = label;
                if (isUpgradeLink && userTier !== 'free') displayLabel = 'Manage Plan';
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-sidebar-accent text-white shadow-sm'
                        : 'text-sidebar-foreground/60 hover:bg-white/8 hover:text-white'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-transform duration-150',
                      active ? 'text-white' : 'text-sidebar-foreground/50 group-hover:text-white group-hover:scale-110'
                    )} />
                    <span className="flex-1">{displayLabel}</span>
                    {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-3">
        {/* XP bar */}
        {xp && (
          <Link href="/dashboard" className="block group">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{xp.rank.badge}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white/80 truncate">{xp.rank.title}</p>
                <p className="text-[10px] text-sidebar-foreground/40">Lv.{xp.rank.level} · {xp.totalXp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xp.percent}%`,
                  background: 'linear-gradient(90deg, var(--sidebar-primary) 0%, color-mix(in srgb, var(--sidebar-primary) 70%, white) 100%)',
                }}
              />
              {/* shimmer */}
              <div
                className="absolute inset-0 rounded-full opacity-40"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)',
                  animation: 'shimmer 2.5s infinite',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </Link>
        )}

        {/* Theme picker */}
        <div>
          <button
            onClick={() => setThemeOpen(!themeOpen)}
            className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-sidebar-foreground/50 hover:bg-white/8 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{THEMES.find(t => t.id === theme)?.label || 'Theme'}</span>
            </div>
            <div className="flex gap-1">
              {(THEMES.find(t => t.id === theme)?.colors || []).slice(0, 3).map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ background: c }} />
              ))}
            </div>
          </button>
          {themeOpen && (
            <div className="grid grid-cols-3 gap-1 mt-1.5 px-1">
              {THEMES.map(t => {
                const isLocked = t.maxOnly && user?.subscriptionTier !== 'max';
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { if (!isLocked) { setTheme(t.id as Theme); setThemeOpen(false); } }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-1 py-2 rounded-lg text-[9px] font-medium transition-all',
                      isActive ? 'bg-white/15 text-white ring-1 ring-white/20' : 'text-sidebar-foreground/50 hover:bg-white/8 hover:text-white',
                      isLocked && 'opacity-40 cursor-not-allowed'
                    )}
                    title={isLocked ? 'Max plan only' : t.label}
                  >
                    <div className="flex gap-0.5">
                      {t.colors.map((c, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="truncate w-full text-center leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User */}
        {user && (
          <div className="flex items-center justify-between">
            <Link href="/profile" className="flex items-center gap-2 min-w-0 group">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                <User className="w-3.5 h-3.5 text-sidebar-foreground/60 group-hover:text-white" />
              </div>
              <span className="text-xs text-sidebar-foreground/60 truncate group-hover:text-white transition-colors">
                {user.name || user.email}
              </span>
              {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                <TierBadge tier={user.subscriptionTier} size="sm" showLabel={false} />
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-500/15 text-sidebar-foreground/40 hover:text-red-400 transition-colors"
              title="Log out"
            >
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 flex items-center px-4 gap-3 border-b border-border bg-background/95 backdrop-blur">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)' }}>
            M
          </div>
          <span className="font-bold text-foreground">MedStudy</span>
        </div>
        {streak && (
          <div className={cn(
            'ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
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
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-56 flex flex-col z-50 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--sidebar)' }}
      >
        {sidebarContent}
      </aside>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
}
