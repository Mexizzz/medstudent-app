'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Play, Pause, Send, Copy, ArrowLeft, Clock, Loader2, LogOut, User
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VoiceChat } from '@/components/voice/VoiceChat';

interface Member {
  id: string;
  userId: string;
  userName: string | null;
  isOnline: boolean;
  timerRunning: boolean;
  timerStartedAt: string | null;
  totalStudiedSecs: number;
  lastSeenAt: string;
  isMicOn: boolean;
  isMutedByAdmin: boolean;
}

interface Message {
  id: string;
  userId: string;
  userName: string | null;
  content: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  joinCode: string;
  createdBy: string;
}

function formatTime(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getLiveSeconds(member: Member): number {
  let total = member.totalStudiedSecs ?? 0;
  if (member.timerRunning && member.timerStartedAt) {
    const elapsed = Math.floor((Date.now() - new Date(member.timerStartedAt).getTime()) / 1000);
    total += Math.max(0, elapsed);
  }
  return total;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tick, setTick] = useState(0); // force re-render for timer

  const lastPollTime = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Get current user
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setMyUserId(d.user.id);
    }).catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/study-rooms/${roomId}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to load room');
          router.push('/study-rooms');
          return;
        }
        setRoom(data.room);
        setMembers(data.members);
        setMessages(data.messages);
        lastPollTime.current = Date.now();
      } catch {
        router.push('/study-rooms');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomId, router]);

  // Polling every 3s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/study-rooms/${roomId}/poll?since=${lastPollTime.current}`);
        const data = await res.json();
        if (!res.ok) return;
        setMembers(data.members);
        if (data.messages?.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
        }
        lastPollTime.current = data.serverTime;
      } catch {}
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [roomId]);

  // Timer tick (update display every second)
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      fetch(`/api/study-rooms/${roomId}/leave`, { method: 'POST' }).catch(() => {});
    };
  }, [roomId]);

  const myMember = members.find(m => m.userId === myUserId);
  const isTimerRunning = myMember?.timerRunning ?? false;

  async function toggleTimer() {
    const action = isTimerRunning ? 'stop' : 'start';
    try {
      await fetch(`/api/study-rooms/${roomId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      // Optimistic update
      setMembers(prev => prev.map(m =>
        m.userId === myUserId
          ? {
              ...m,
              timerRunning: action === 'start',
              timerStartedAt: action === 'start' ? new Date().toISOString() : null,
              totalStudiedSecs: action === 'stop'
                ? getLiveSeconds(m)
                : m.totalStudiedSecs,
            }
          : m
      ));
    } catch {
      toast.error('Failed to toggle timer');
    }
  }

  async function sendMessage() {
    if (!chatInput.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/study-rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, data.message]);
      setChatInput('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function copyCode() {
    if (room?.joinCode) {
      navigator.clipboard.writeText(room.joinCode);
      toast.success('Room code copied!');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] lg:h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!room) return null;

  const onlineMembers = members.filter(m => m.isOnline);
  const myLiveTime = myMember ? getLiveSeconds(myMember) : 0;

  // Total room study time
  const totalRoomSecs = members.reduce((sum, m) => sum + getLiveSeconds(m), 0);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Left: Main area (timer + members) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/study-rooms')} className="gap-1 text-slate-400 -ml-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-800 truncate">{room.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {onlineMembers.length} online
              </span>
              <button onClick={copyCode} className="flex items-center gap-1 hover:text-indigo-500 transition-colors font-mono tracking-wider">
                <Copy className="w-3 h-3" />
                {room.joinCode}
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { router.push('/study-rooms'); }}
            className="text-slate-400 hover:text-red-500 gap-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>

        {/* Timer section */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {/* My Timer */}
          <div className="text-center mb-8">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Your Study Time</p>
            <div className={cn(
              'text-5xl sm:text-6xl font-mono font-bold tabular-nums transition-colors',
              isTimerRunning ? 'text-indigo-600' : 'text-slate-700'
            )}>
              {formatTime(myLiveTime)}
            </div>
            <Button
              onClick={toggleTimer}
              size="lg"
              className={cn(
                'mt-4 gap-2 px-8',
                isTimerRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-indigo-500 hover:bg-indigo-600'
              )}
            >
              {isTimerRunning ? <><Pause className="w-5 h-5" />Pause</> : <><Play className="w-5 h-5" />Start Studying</>}
            </Button>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Room total: {formatTime(totalRoomSecs)}
              </span>
            </div>
          </div>

          {/* Voice Chat */}
          {myUserId && room && (
            <div className="mb-8">
              <VoiceChat
                roomId={roomId}
                myUserId={myUserId}
                isRoomCreator={room.createdBy === myUserId}
                members={members.map(m => ({
                  userId: m.userId,
                  userName: m.userName,
                  isOnline: m.isOnline,
                  isMicOn: m.isMicOn ?? false,
                  isMutedByAdmin: m.isMutedByAdmin ?? false,
                }))}
                onMembersUpdate={() => {}}
              />
            </div>
          )}

          {/* Members grid */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 px-1">Members</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {members.map(m => {
                const liveSecs = getLiveSeconds(m);
                return (
                  <Card key={m.id} className={cn(
                    'transition-all',
                    m.isOnline ? 'border-slate-200' : 'border-slate-100 opacity-50',
                    m.timerRunning && 'border-indigo-200 bg-indigo-50/30'
                  )}>
                    <CardContent className="p-3 text-center">
                      <div className="relative inline-block mb-1">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          m.userId === myUserId ? 'bg-indigo-100' : 'bg-slate-100'
                        )}>
                          <User className={cn('w-4 h-4', m.userId === myUserId ? 'text-indigo-600' : 'text-slate-400')} />
                        </div>
                        {m.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 truncate">{m.userName || 'Anonymous'}</p>
                      <p className={cn(
                        'text-xs font-mono mt-1',
                        m.timerRunning ? 'text-indigo-600 font-semibold' : 'text-slate-400'
                      )}>
                        {m.timerRunning && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1 animate-pulse" />}
                        {formatTime(liveSecs)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Chat panel */}
      <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col bg-white shrink-0 h-64 lg:h-auto">
        <div className="px-4 py-3 border-b border-slate-200 shrink-0">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-indigo-500" />
            Chat
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No messages yet. Say hi!</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn(
              'text-xs',
              msg.userId === myUserId ? 'text-right' : ''
            )}>
              <span className="font-semibold text-slate-600">
                {msg.userId === myUserId ? 'You' : (msg.userName || 'Anonymous')}
              </span>
              <div className={cn(
                'inline-block px-3 py-1.5 rounded-2xl mt-0.5 max-w-[85%] text-left',
                msg.userId === myUserId
                  ? 'bg-indigo-500 text-white ml-auto'
                  : 'bg-slate-100 text-slate-700'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="shrink-0 border-t border-slate-200 px-3 py-2 flex gap-2">
          <Input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="text-xs h-8"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!chatInput.trim() || sending}
            size="sm"
            className="h-8 w-8 p-0 shrink-0 bg-indigo-500 hover:bg-indigo-600"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </aside>
    </div>
  );
}
