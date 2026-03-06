'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Plus, LogIn, Loader2, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RoomSummary {
  id: string;
  name: string;
  joinCode: string;
  createdBy: string;
  memberCount: number;
  createdAt: string;
}

export default function StudyRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Create room
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  // Join room
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  async function fetchRooms() {
    try {
      const res = await fetch('/api/study-rooms');
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRooms(); }, []);

  async function handleCreate() {
    if (!roomName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/study-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Room created! Code: ${data.joinCode}`);
      setCreateOpen(false);
      setRoomName('');
      router.push(`/study-rooms/${data.roomId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    try {
      const res = await fetch('/api/study-rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Joined "${data.roomName}"!`);
      setJoinOpen(false);
      setJoinCode('');
      router.push(`/study-rooms/${data.roomId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid room code');
    } finally {
      setJoining(false);
    }
  }

  async function handleDelete(roomId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/study-rooms/${roomId}`, { method: 'DELETE' });
      setRooms(prev => prev.filter(r => r.id !== roomId));
      toast.success('Room closed');
    } catch {
      toast.error('Failed to close room');
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Study Rooms
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Study together with friends in real-time</p>
        </div>
        <div className="flex gap-2">
          {/* Join Dialog */}
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                Join Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
              <DialogHeader>
                <DialogTitle>Join a Study Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Room Code</Label>
                  <Input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-letter code"
                    className="mt-1 text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                </div>
                <Button onClick={handleJoin} disabled={joinCode.length < 6 || joining} className="w-full">
                  {joining ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</> : 'Join Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-indigo-500 hover:bg-indigo-600">
                <Plus className="w-3.5 h-3.5" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
              <DialogHeader>
                <DialogTitle>Create Study Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Room Name</Label>
                  <Input
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder="e.g. Histology Study Group"
                    className="mt-1"
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <Button onClick={handleCreate} disabled={!roomName.trim() || creating} className="w-full bg-indigo-500 hover:bg-indigo-600">
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Room List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <div className="p-5 bg-indigo-50 rounded-full">
            <Users className="w-10 h-10 text-indigo-400" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground">No study rooms yet</p>
          <p className="text-muted-foreground text-sm">Create a room or join one with a code to start studying together.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
            <Card
              key={room.id}
              className="hover:border-indigo-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/study-rooms/${room.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{room.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      {room.memberCount} online
                    </span>
                    <span className="font-mono tracking-wider">{room.joinCode}</span>
                  </div>
                </div>
                <button
                  onClick={e => handleDelete(room.id, e)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  title="Close room"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
