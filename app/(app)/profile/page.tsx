'use client';

import { useEffect, useState } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { getRankFromXp, getXpProgress, RANKS } from '@/lib/xp';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  totalXp: number;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setName(data.name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, bio }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg({ text: data.error, type: 'error' });
    } else {
      setMsg({ text: 'Profile updated!', type: 'success' });
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const xp = getXpProgress(profile.totalXp);
  const rank = xp.rank;
  const nextRank = xp.nextRank;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* Rank Card */}
      <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{rank.badge}</span>
          <div>
            <p className="text-2xl font-bold">{rank.title}</p>
            <p className="text-white/70">Level {rank.level} · {xp.totalXp.toLocaleString()} XP</p>
          </div>
        </div>
        {nextRank && (
          <div>
            <div className="flex justify-between text-sm text-white/70 mb-1">
              <span>{xp.xpInLevel} / {xp.xpForNext} XP</span>
              <span>Next: {nextRank.badge} {nextRank.title}</span>
            </div>
            <div className="w-full h-3 bg-card/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-card/80 rounded-full transition-all"
                style={{ width: `${xp.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email</label>
          <input
            type="text"
            value={profile.email}
            disabled
            className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Username</label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="username"
              maxLength={20}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Letters, numbers, and underscores only. Friends can find you by this.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell others about yourself..."
            rows={3}
            maxLength={200}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {msg && (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {msg.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* All Ranks */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">All Ranks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RANKS.map(r => (
            <div
              key={r.level}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                r.level === rank.level
                  ? 'border-violet-300 bg-violet-50'
                  : r.minXp <= xp.totalXp
                    ? 'border-border bg-card'
                    : 'border-border bg-muted opacity-50'
              }`}
            >
              <span className="text-2xl">{r.badge}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">Lv.{r.level} · {r.minXp.toLocaleString()} XP</p>
              </div>
              {r.level === rank.level && (
                <span className="ml-auto text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Current</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
