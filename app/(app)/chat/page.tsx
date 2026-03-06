'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Loader2 } from 'lucide-react';

interface Conversation {
  friend: { id: string; name: string | null; username: string | null; avatarUrl: string | null };
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chat')
      .then(r => r.json())
      .then(data => { setConversations(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No conversations yet. Add friends and start chatting!</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {conversations.map(conv => (
            <button
              key={conv.friend.id}
              onClick={() => router.push(`/chat/${conv.friend.id}`)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                {(conv.friend.name || conv.friend.username || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">
                    {conv.friend.name || conv.friend.username || 'Unknown'}
                  </p>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {conv.lastMessage ? (
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.content}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No messages yet</p>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
