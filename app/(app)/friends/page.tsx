'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Check, X, MessageCircle, Loader2, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TierBadge } from '@/components/ui/TierBadge';

interface Friend {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  subscriptionTier?: string;
}

interface IncomingRequest {
  id: string;
  fromUserId: string;
  createdAt: string;
  fromUser: { id: string; name: string | null; username: string | null } | null;
}

interface OutgoingRequest {
  id: string;
  toUserId: string;
  createdAt: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState('');
  const [addMsg, setAddMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [adding, setAdding] = useState(false);

  async function loadFriends() {
    const res = await fetch('/api/friends');
    const data = await res.json();
    setFriends(data.friends || []);
    setIncoming(data.incoming || []);
    setOutgoing(data.outgoing || []);
    setLoading(false);
  }

  useEffect(() => { loadFriends(); }, []);

  async function handleAdd() {
    if (!addUsername.trim()) return;
    setAdding(true);
    setAddMsg(null);
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: addUsername.trim() }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setAddMsg({ text: data.error, type: 'error' });
    } else {
      setAddMsg({ text: 'Friend request sent!', type: 'success' });
      setAddUsername('');
      loadFriends();
    }
  }

  async function handleRespond(requestId: string, action: 'accept' | 'reject') {
    await fetch('/api/friends/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    loadFriends();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Friends</h1>
        <span className="text-sm text-muted-foreground">{friends.length} friend{friends.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add Friend */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Add Friend by Username</h2>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-border rounded-lg px-3">
            <span className="text-muted-foreground text-sm mr-1">@</span>
            <input
              type="text"
              value={addUsername}
              onChange={e => setAddUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="username"
              className="flex-1 py-2 text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !addUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Send
          </button>
        </div>
        {addMsg && (
          <p className={`text-sm mt-2 ${addMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {addMsg.text}
          </p>
        )}
      </div>

      {/* Incoming Requests */}
      {incoming.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Friend Requests ({incoming.length})</h2>
          <div className="space-y-3">
            {incoming.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {req.fromUser?.name || req.fromUser?.username || 'Unknown'}
                  </p>
                  {req.fromUser?.username && (
                    <p className="text-xs text-muted-foreground">@{req.fromUser.username}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friends.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No friends yet. Add someone by username!</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {friend.name || friend.username || 'Unknown'}
                  </p>
                  {friend.subscriptionTier && <TierBadge tier={friend.subscriptionTier} size="sm" showLabel={false} />}
                </div>
                {friend.username && (
                  <p className="text-xs text-muted-foreground">@{friend.username}</p>
                )}
                {friend.bio && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{friend.bio}</p>
                )}
              </div>
              <button
                onClick={() => router.push(`/chat/${friend.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
