'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Lock, Users, BookOpen, HelpCircle, Activity, MessageSquare, LogOut, KeyRound,
  Crown, TrendingUp, Zap, FileText, FolderOpen, UserPlus, Stethoscope,
  Search, ChevronDown, ChevronUp, BarChart2, Calendar, Eye, EyeOff,
  Send, CheckCircle2, Clock, XCircle, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminData {
  stats: {
    users: number; sources: number; questions: number; sessions: number;
    responses: number; rooms: number; lessons: number; summaries: number;
    folders: number; friendships: number; doctorPdfs: number;
    tickets: number; openTickets: number;
  };
  tierBreakdown: { tier: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  signupsPerDay: { date: string; count: number }[];
  todayUsage: { action: string; total: number; uniqueUsers: number }[];
  avgScore: number | null;
  completedSessions: number;
  sourceTypes: { type: string; count: number }[];
  users: {
    id: string; email: string; name: string | null; username: string | null;
    passwordHash: string; subscriptionTier: string; subscriptionStatus: string | null;
    stripeCustomerId: string | null; subscriptionEndsAt: string | null;
    createdAt: string; sessionCount: number; responseCount: number;
    sourceCount: number; questionCount: number; avgScore: number | null;
    lastActive: string | number | null;
  }[];
  recentSessions: {
    id: string; userId: string; userEmail: string; status: string;
    totalQuestions: number; correctCount: number; score: number | null; startedAt: string;
  }[];
  rooms: {
    id: string; name: string; joinCode: string; createdAt: string;
    creatorEmail: string; memberCount: number;
  }[];
  tickets: {
    id: string; userId: string; userEmail: string; userName: string | null;
    subject: string; status: string; createdAt: string; updatedAt: string;
    messageCount: number; lastMessage: string | null;
  }[];
}

const TIER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  free: { bg: 'bg-slate-500/20', text: 'text-slate-300', dot: 'bg-slate-400' },
  pro: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  max: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  canceled: 'bg-red-500/20 text-red-400',
  past_due: 'bg-amber-500/20 text-amber-400',
};

function TierBadge({ tier }: { tier: string }) {
  const c = TIER_COLORS[tier] || TIER_COLORS.free;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {tier === 'max' && <Crown className="w-3 h-3" />}
      {tier === 'pro' && <Zap className="w-3 h-3" />}
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function timeAgo(val: string | number | null | undefined): string {
  if (val == null) return 'Never';
  // If it's a number or numeric string, treat as unix timestamp (seconds)
  const num = Number(val);
  if (!isNaN(num) && num > 0) {
    // Distinguish seconds vs milliseconds: if < 1e12, it's seconds
    const ms = num < 1e12 ? num * 1000 : num;
    return formatDiff(Date.now() - ms);
  }
  // Try as date string
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return formatDiff(Date.now() - d.getTime());
  }
  return 'Unknown';
}

function formatDiff(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'sessions' | 'questions' | 'score'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sessions' | 'rooms' | 'support'>('overview');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingTier, setChangingTier] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<{ id: string; senderId: string; isAdmin: boolean; message: string; createdAt: string }[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('all');
  const [sendingReply, setSendingReply] = useState(false);

  async function handleChangeTier(userId: string, tier: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, action: 'changeTier', userId, tier }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(`Tier changed to ${tier.toUpperCase()}`);
      // Update local data
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, subscriptionTier: tier } : u),
          tierBreakdown: prev.tierBreakdown, // will be stale but acceptable until refresh
        };
      });
      setChangingTier(null);
    } catch {
      toast.error('Failed to change tier');
    }
  }

  async function loadTicketMessages(ticketId: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, action: 'getMessages', ticketId }),
      });
      const json = await res.json();
      setTicketMessages(json.messages || []);
      setActiveTicketId(ticketId);
    } catch {
      toast.error('Failed to load messages');
    }
  }

  async function handleAdminReply() {
    if (!adminReply.trim() || !activeTicketId) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, action: 'reply', ticketId: activeTicketId, message: adminReply }),
      });
      if (res.ok) {
        setAdminReply('');
        loadTicketMessages(activeTicketId);
        // Update ticket status locally
        setData(prev => prev ? {
          ...prev,
          tickets: prev.tickets.map(t => t.id === activeTicketId ? { ...t, status: 'replied' } : t),
        } : prev);
      } else {
        toast.error('Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleCloseTicket(ticketId: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, action: 'closeTicket', ticketId }),
      });
      if (res.ok) {
        toast.success('Ticket closed');
        setData(prev => prev ? {
          ...prev,
          tickets: prev.tickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t),
          stats: { ...prev.stats, openTickets: Math.max(0, prev.stats.openTickets - 1) },
        } : prev);
        if (activeTicketId === ticketId) setActiveTicketId(null);
      }
    } catch {
      toast.error('Failed to close ticket');
    }
  }

  async function handleLogin() {
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setData(json);
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(userId: string) {
    if (!newPass || newPass.length < 4) { toast.error('Min 4 characters'); return; }
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, userId, newPassword: newPass }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success('Password reset successfully');
      setResetUserId(null);
      setNewPass('');
    } catch {
      toast.error('Failed to reset');
    }
  }

  // Login screen
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <Card className="w-full max-w-sm relative bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8 space-y-5">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-indigo-500/30">
                <Lock className="w-7 h-7 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400 mt-1.5">MedStudy Dashboard</p>
            </div>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 h-11"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-semibold">
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, tierBreakdown, todayUsage, avgScore, completedSessions, sourceTypes, users: allUsers, recentSessions, rooms, signupsPerDay, tickets: allTickets } = data;

  // Tier counts
  const tierCounts: Record<string, number> = { free: 0, pro: 0, max: 0 };
  tierBreakdown.forEach(t => { tierCounts[t.tier] = t.count; });

  // Filter & sort users
  let filteredUsers = allUsers.filter(u => {
    const matchSearch = !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.name || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchTier = tierFilter === 'all' || u.subscriptionTier === tierFilter;
    return matchSearch && matchTier;
  });

  filteredUsers = [...filteredUsers].sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    switch (sortBy) {
      case 'sessions': return (a.sessionCount - b.sessionCount) * dir;
      case 'questions': return (a.questionCount - b.questionCount) * dir;
      case 'score': return ((a.avgScore ?? 0) - (b.avgScore ?? 0)) * dir;
      default: return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    }
  });

  const totalRevenue = tierCounts.pro * 7.99 + tierCounts.max * 14.99;
  const todaySignups = signupsPerDay.length > 0 ? signupsPerDay[signupsPerDay.length - 1] : null;

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col
    ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
    : null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart2 },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'sessions' as const, label: 'Sessions', icon: Activity },
    { id: 'rooms' as const, label: 'Rooms', icon: MessageSquare },
    { id: 'support' as const, label: 'Support', icon: HelpCircle, badge: stats.openTickets },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <Stethoscope className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">MedStudy Admin</h1>
              <p className="text-xs text-slate-500">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">{stats.users} users</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setData(null)} className="text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white">
              <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {'badge' in tab && tab.badge ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue & Tier Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/10 rounded-2xl p-5 border border-indigo-500/20">
                <p className="text-xs text-indigo-300 font-medium mb-1">Monthly Revenue (est.)</p>
                <p className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-2">{tierCounts.pro} Pro + {tierCounts.max} Max</p>
              </div>
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats.users}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {todaySignups?.date === new Date().toISOString().split('T')[0] ? `+${todaySignups.count} today` : 'No signups today'}
                </p>
              </div>
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium mb-1">Avg. Score</p>
                <p className="text-3xl font-bold text-white">{avgScore != null ? `${avgScore}%` : '—'}</p>
                <p className="text-xs text-slate-500 mt-2">{completedSessions} completed sessions</p>
              </div>
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium mb-1">Total Questions</p>
                <p className="text-3xl font-bold text-white">{stats.questions.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">{stats.responses.toLocaleString()} responses</p>
              </div>
            </div>

            {/* Subscription Tiers Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" /> Subscription Tiers
                </h3>
                <div className="space-y-3">
                  {(['free', 'pro', 'max'] as const).map(tier => {
                    const count = tierCounts[tier] || 0;
                    const pct = stats.users > 0 ? (count / stats.users) * 100 : 0;
                    const colors = { free: 'bg-slate-500', pro: 'bg-blue-500', max: 'bg-amber-500' };
                    return (
                      <div key={tier}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <TierBadge tier={tier} />
                          </div>
                          <span className="text-sm font-semibold text-white">{count} <span className="text-slate-500 font-normal">({pct.toFixed(1)}%)</span></span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colors[tier]} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Today's Usage */}
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Today&apos;s Activity
                </h3>
                {todayUsage.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity today yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {todayUsage.map(u => (
                      <div key={u.action} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-slate-300 capitalize">{u.action.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{u.uniqueUsers} users</span>
                          <span className="text-sm font-semibold text-white bg-slate-800 px-2.5 py-0.5 rounded-full">{u.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Sources', value: stats.sources, icon: BookOpen, color: 'text-emerald-400' },
                { label: 'Sessions', value: stats.sessions, icon: Activity, color: 'text-purple-400' },
                { label: 'Lessons', value: stats.lessons, icon: FileText, color: 'text-cyan-400' },
                { label: 'Summaries', value: stats.summaries, icon: FileText, color: 'text-orange-400' },
                { label: 'Folders', value: stats.folders, icon: FolderOpen, color: 'text-blue-400' },
                { label: 'Rooms', value: stats.rooms, icon: MessageSquare, color: 'text-pink-400' },
                { label: 'Friendships', value: stats.friendships, icon: UserPlus, color: 'text-teal-400' },
                { label: 'Doctor PDFs', value: stats.doctorPdfs, icon: Stethoscope, color: 'text-rose-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs text-slate-500">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Source Types & Signups */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> Content Source Types
                </h3>
                <div className="space-y-2">
                  {sourceTypes.map(s => (
                    <div key={s.type} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-300 capitalize">{s.type.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold text-white bg-slate-800 px-2.5 py-0.5 rounded-full">{s.count}</span>
                    </div>
                  ))}
                  {sourceTypes.length === 0 && <p className="text-sm text-slate-500">No sources yet</p>}
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" /> Recent Signups (30 days)
                </h3>
                <div className="space-y-1">
                  {signupsPerDay.length === 0 ? (
                    <p className="text-sm text-slate-500">No signups in the last 30 days</p>
                  ) : (
                    <div className="flex items-end gap-1 h-24">
                      {signupsPerDay.slice(-30).map((d, i) => {
                        const maxCount = Math.max(...signupsPerDay.map(x => x.count));
                        const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                            <div className="hidden group-hover:block absolute -top-8 bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                              {d.date}: {d.count}
                            </div>
                            <div
                              className="w-full bg-indigo-500 rounded-t hover:bg-indigo-400 transition-colors min-h-[2px]"
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'free', 'pro', 'max'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      tierFilter === tier ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier === 'all' ? `All (${stats.users})` : `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${tierCounts[tier] || 0})`}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswords(v => !v)}
                className="text-slate-400 border-slate-700 hover:bg-slate-800 gap-1.5"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPasswords ? 'Hide' : 'Show'} Hashes
              </Button>
            </div>

            <p className="text-xs text-slate-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} shown</p>

            {/* Users Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Tier</th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:text-slate-300" onClick={() => toggleSort('sessions')}>
                        <span className="flex items-center gap-1">Sessions <SortIcon col="sessions" /></span>
                      </th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:text-slate-300" onClick={() => toggleSort('questions')}>
                        <span className="flex items-center gap-1">Questions <SortIcon col="questions" /></span>
                      </th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:text-slate-300" onClick={() => toggleSort('score')}>
                        <span className="flex items-center gap-1">Avg Score <SortIcon col="score" /></span>
                      </th>
                      <th className="px-4 py-3 text-left">Sources</th>
                      <th className="px-4 py-3 text-left">Last Active</th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:text-slate-300" onClick={() => toggleSort('date')}>
                        <span className="flex items-center gap-1">Joined <SortIcon col="date" /></span>
                      </th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredUsers.map(u => (
                      <>
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} className="text-left">
                              <p className="font-medium text-white text-sm">{u.name || u.email.split('@')[0]}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {changingTier === u.id ? (
                              <div className="flex items-center gap-1">
                                {(['free', 'pro', 'max'] as const).map(t => (
                                  <button
                                    key={t}
                                    onClick={() => handleChangeTier(u.id, t)}
                                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                                      u.subscriptionTier === t
                                        ? 'ring-2 ring-indigo-500 bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                                  >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                  </button>
                                ))}
                                <button onClick={() => setChangingTier(null)} className="text-slate-500 hover:text-white text-xs ml-1">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setChangingTier(u.id)} title="Click to change tier">
                                <TierBadge tier={u.subscriptionTier} />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{u.sessionCount}</td>
                          <td className="px-4 py-3 text-slate-300">{u.questionCount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {u.avgScore != null ? (
                              <span className={`font-semibold ${u.avgScore >= 70 ? 'text-emerald-400' : u.avgScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {u.avgScore}%
                              </span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{u.sourceCount}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(u.lastActive)}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {resetUserId === u.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="text"
                                  value={newPass}
                                  onChange={e => setNewPass(e.target.value)}
                                  placeholder="New password"
                                  className="h-7 w-28 text-xs bg-slate-800 border-slate-700 text-white"
                                  onKeyDown={e => e.key === 'Enter' && handleResetPassword(u.id)}
                                />
                                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleResetPassword(u.id)}>Set</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={() => { setResetUserId(null); setNewPass(''); }}>X</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-slate-500 hover:text-white" onClick={() => setResetUserId(u.id)}>
                                <KeyRound className="w-3 h-3" /> Reset
                              </Button>
                            )}
                          </td>
                        </tr>
                        {expandedUser === u.id && (
                          <tr key={`${u.id}-detail`} className="bg-slate-800/20">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <span className="text-slate-500">User ID</span>
                                  <p className="font-mono text-slate-300 mt-0.5 break-all">{u.id}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Username</span>
                                  <p className="text-slate-300 mt-0.5">{u.username || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Sub Status</span>
                                  <p className="mt-0.5">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[u.subscriptionStatus || 'active'] || STATUS_COLORS.active}`}>
                                      {u.subscriptionStatus || 'active'}
                                    </span>
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Sub Ends</span>
                                  <p className="text-slate-300 mt-0.5">{u.subscriptionEndsAt ? new Date(u.subscriptionEndsAt).toLocaleDateString() : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Stripe Customer</span>
                                  <p className="font-mono text-slate-300 mt-0.5 break-all">{u.stripeCustomerId || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Responses</span>
                                  <p className="text-slate-300 mt-0.5">{u.responseCount.toLocaleString()}</p>
                                </div>
                                {showPasswords && (
                                  <div className="col-span-2">
                                    <span className="text-slate-500">Password Hash</span>
                                    <p className="font-mono text-slate-400 mt-0.5 text-[10px] break-all">{u.passwordHash}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {activeTab === 'sessions' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Recent Sessions
              </h2>
              <span className="text-xs text-slate-500">Last 30</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Questions</th>
                    <th className="px-4 py-3 text-left">Correct</th>
                    <th className="px-4 py-3 text-left">Score</th>
                    <th className="px-4 py-3 text-left">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentSessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 text-xs">{s.userEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{s.totalQuestions}</td>
                      <td className="px-4 py-3 text-slate-300">{s.correctCount}</td>
                      <td className="px-4 py-3">
                        {s.score != null ? (
                          <span className={`font-semibold ${s.score >= 70 ? 'text-emerald-400' : s.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {Math.round(s.score)}%
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(s.startedAt)}</td>
                    </tr>
                  ))}
                  {recentSessions.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No sessions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUPPORT TAB ── */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            {activeTicketId ? (() => {
              const ticket = data.tickets.find(t => t.id === activeTicketId);
              const TICKET_STATUS: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
                open: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Clock },
                replied: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
                closed: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: XCircle },
              };
              const st = TICKET_STATUS[ticket?.status || 'open'] || TICKET_STATUS.open;
              const StIcon = st.icon;
              return (
                <div className="space-y-4">
                  <button onClick={() => setActiveTicketId(null)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Back to tickets
                  </button>
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-white">{ticket?.subject}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{ticket?.userEmail} &middot; {ticket?.userName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                          <StIcon className="w-3 h-3" />
                          {ticket?.status}
                        </span>
                        {ticket?.status !== 'closed' && (
                          <Button size="sm" variant="outline" className="text-xs text-slate-400 border-slate-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30" onClick={() => handleCloseTicket(activeTicketId)}>
                            <XCircle className="w-3 h-3 mr-1" /> Close
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                      {ticketMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.isAdmin
                              ? 'bg-indigo-600 text-white rounded-br-md'
                              : 'bg-slate-800 text-slate-200 rounded-bl-md'
                          }`}>
                            <p className="text-xs font-medium mb-1 opacity-70">{msg.isAdmin ? 'You (Admin)' : ticket?.userEmail}</p>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-[10px] opacity-50 mt-1">{timeAgo(msg.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                      {ticketMessages.length === 0 && <p className="text-center text-slate-500 py-8">No messages</p>}
                    </div>
                    {ticket?.status !== 'closed' && (
                      <div className="p-3 border-t border-slate-800 flex gap-2">
                        <Input
                          value={adminReply}
                          onChange={e => setAdminReply(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdminReply()}
                        />
                        <Button onClick={handleAdminReply} size="icon" disabled={!adminReply.trim() || sendingReply} className="bg-indigo-600 hover:bg-indigo-700">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400" /> Support Tickets
                    {stats.openTickets > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-semibold">{stats.openTickets} open</span>}
                  </h2>
                  <div className="flex gap-1">
                    {(['all', 'open', 'replied', 'closed'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setTicketFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          ticketFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="divide-y divide-slate-800/50">
                    {data.tickets
                      .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
                      .map(ticket => {
                        const TICKET_STATUS: Record<string, { bg: string; text: string }> = {
                          open: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
                          replied: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
                          closed: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
                        };
                        const st = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;
                        return (
                          <button
                            key={ticket.id}
                            onClick={() => loadTicketMessages(ticket.id)}
                            className="w-full text-left px-4 py-3.5 hover:bg-slate-800/30 transition-colors flex items-start gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-white text-sm truncate">{ticket.subject}</h3>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${st.bg} ${st.text}`}>{ticket.status}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{ticket.userEmail} {ticket.userName ? `(${ticket.userName})` : ''}</p>
                              {ticket.lastMessage && <p className="text-xs text-slate-600 mt-1 truncate">{ticket.lastMessage}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[11px] text-slate-500">{timeAgo(ticket.updatedAt)}</span>
                              <span className="text-[11px] text-slate-600">{ticket.messageCount} msgs</span>
                            </div>
                          </button>
                        );
                      })}
                    {data.tickets.filter(t => ticketFilter === 'all' || t.status === ticketFilter).length === 0 && (
                      <div className="px-4 py-12 text-center text-slate-500">No {ticketFilter === 'all' ? '' : ticketFilter} tickets</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ROOMS TAB ── */}
        {activeTab === 'rooms' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pink-400" /> Study Rooms
              </h2>
              <span className="text-xs text-slate-500">{rooms.length} rooms</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Join Code</th>
                    <th className="px-4 py-3 text-left">Creator</th>
                    <th className="px-4 py-3 text-left">Members</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {rooms.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-indigo-400 tracking-wider">{r.joinCode}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{r.creatorEmail}</td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-800 px-2 py-0.5 rounded-full text-xs text-slate-300">{r.memberCount}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                  {rooms.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No rooms yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
