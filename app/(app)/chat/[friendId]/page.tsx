'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export default function ChatConversationPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [friendName, setFriendName] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMyId(d.user?.id));
    fetch('/api/friends').then(r => r.json()).then(d => {
      const friend = d.friends?.find((f: { id: string }) => f.id === friendId);
      if (friend) setFriendName(friend.name || friend.username || 'Friend');
    });
  }, [friendId]);

  async function loadMessages() {
    const res = await fetch(`/api/chat/${friendId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/chat/${friendId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setText('');
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button onClick={() => router.push('/chat')} className="p-1 rounded hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
          {friendName ? friendName[0].toUpperCase() : '?'}
        </div>
        <span className="font-medium text-slate-800">{friendName || 'Loading...'}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === myId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
