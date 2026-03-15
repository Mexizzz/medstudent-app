'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, Globe, Loader2, Crown, Medal } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';
import { getXpProgress } from '@/lib/xp';

interface LeaderboardEntry {
  userId: string;
  totalXp: number;
  name: string | null;
  username: string | null;
  subscriptionTier: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [loading, setLoading] = useState(true);

  async function loadLeaderboard(s: string) {
    setLoading(true);
    const res = await fetch(`/api/leaderboard?scope=${s}`);
    const data = await res.json();
    setEntries(data.leaderboard || []);
    setCurrentUserId(data.currentUserId);
    setCurrentUserRank(data.currentUserRank);
    setLoading(false);
  }

  useEffect(() => { loadLeaderboard(scope); }, [scope]);

  const RANK_COLORS = ['', 'text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              {currentUserRank ? `Your rank: #${currentUserRank}` : 'Compete with others'}
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setScope('global')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              scope === 'global' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Global
          </button>
          <button
            onClick={() => setScope('friends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              scope === 'friends' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Friends
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No entries yet. Start studying to earn XP!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = entry.userId === currentUserId;
            const xp = getXpProgress(entry.totalXp);

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isMe ? 'bg-primary/5' : ''
                } ${rank <= 3 ? 'bg-amber-50/30' : ''}`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {rank === 1 ? (
                    <Crown className="w-5 h-5 text-amber-500 mx-auto" />
                  ) : rank <= 3 ? (
                    <Medal className={`w-5 h-5 mx-auto ${RANK_COLORS[rank]}`} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{rank}</span>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                      {entry.name || entry.username || 'Anonymous'}
                      {isMe && <span className="text-xs text-primary ml-1">(You)</span>}
                    </span>
                    <TierBadge tier={entry.subscriptionTier} size="sm" showLabel={false} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs">{xp.rank.badge}</span>
                    <span className="text-xs text-muted-foreground">{xp.rank.title}</span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{entry.totalXp.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
