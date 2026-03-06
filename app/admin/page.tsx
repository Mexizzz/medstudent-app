'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Users, BookOpen, HelpCircle, Activity, MessageSquare, LogOut, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface AdminData {
  stats: { users: number; sources: number; questions: number; sessions: number; responses: number; rooms: number };
  users: { id: string; email: string; name: string | null; passwordHash: string; createdAt: string; sessionCount: number; responseCount: number }[];
  recentSessions: { id: string; userId: string; status: string; totalQuestions: number; correctCount: number; score: number | null; startedAt: string }[];
  rooms: { id: string; name: string; joinCode: string; createdAt: string; memberCount: number }[];
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');

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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <Lock className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter admin password</p>
            </div>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-indigo-500 hover:bg-indigo-600">
              {loading ? 'Loading...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, users, recentSessions, rooms } = data;
  const statCards = [
    { label: 'Users', value: stats.users, icon: Users, color: 'bg-blue-500' },
    { label: 'Sources', value: stats.sources, icon: BookOpen, color: 'bg-emerald-500' },
    { label: 'Questions', value: stats.questions, icon: HelpCircle, color: 'bg-amber-500' },
    { label: 'Sessions', value: stats.sessions, icon: Activity, color: 'bg-purple-500' },
    { label: 'Responses', value: stats.responses, icon: MessageSquare, color: 'bg-pink-500' },
    { label: 'Rooms', value: stats.rooms, icon: Users, color: 'bg-indigo-500' },
  ];

  return (
    <div className="min-h-screen bg-foreground text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" size="sm" onClick={() => setData(null)} className="text-muted-foreground border-slate-600 hover:bg-foreground">
            <LogOut className="w-4 h-4 mr-1.5" /> Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(s => (
            <div key={s.label} className="bg-foreground rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${s.color}`}>
                  <s.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Users */}
        <div className="bg-foreground rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold">All Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-750 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Password Hash</th>
                  <th className="px-4 py-2">Sessions</th>
                  <th className="px-4 py-2">Responses</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted">
                    <td className="px-4 py-2.5 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2.5">{u.name || '-'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground max-w-[150px] truncate" title={u.passwordHash}>{u.passwordHash.slice(0, 20)}...</td>
                    <td className="px-4 py-2.5">{u.sessionCount}</td>
                    <td className="px-4 py-2.5">{u.responseCount}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      {resetUserId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="text"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            placeholder="New password"
                            className="h-7 w-28 text-xs bg-slate-700 border-slate-600"
                            onKeyDown={e => e.key === 'Enter' && handleResetPassword(u.id)}
                          />
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleResetPassword(u.id)}>Set</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResetUserId(null); setNewPass(''); }}>X</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-slate-200" onClick={() => setResetUserId(u.id)}>
                          <KeyRound className="w-3 h-3" /> Reset
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-foreground rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold">Recent Sessions (last 20)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-750 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Questions</th>
                  <th className="px-4 py-2">Correct</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSessions.map(s => (
                  <tr key={s.id} className="hover:bg-muted">
                    <td className="px-4 py-2.5 font-mono text-xs">{s.userId.slice(0, 12)}...</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{s.totalQuestions}</td>
                    <td className="px-4 py-2.5">{s.correctCount}</td>
                    <td className="px-4 py-2.5">{s.score != null ? `${Math.round(s.score)}%` : '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {recentSessions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Study Rooms */}
        <div className="bg-foreground rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold">Study Rooms ({rooms.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-750 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Join Code</th>
                  <th className="px-4 py-2">Members</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rooms.map(r => (
                  <tr key={r.id} className="hover:bg-muted">
                    <td className="px-4 py-2.5">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono tracking-wider">{r.joinCode}</td>
                    <td className="px-4 py-2.5">{r.memberCount}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No rooms yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
