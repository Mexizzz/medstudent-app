'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  code: string;
  name: string;
  max_members: number;
  body_double: number;
  active_count: number;
  total_count: number;
}

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function RoomsPanel({ value, onChange, disabled }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBodyDouble, setNewBodyDouble] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/focus/rooms');
      const d = await r.json();
      if (d.rooms) setRooms(d.rooms);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function createRoom() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch('/api/focus/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), bodyDouble: newBodyDouble }),
      });
      const d = await r.json();
      if (d.code) {
        onChange(d.code);
        setShowCreate(false);
        setNewName('');
        setNewBodyDouble(false);
        load();
      }
    } finally { setCreating(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Coworking rooms</span>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3 h-3" /> New
        </button>
      </div>

      {showCreate && (
        <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value.slice(0, 60))}
            placeholder="Room name (e.g. Pharma grind)"
            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={newBodyDouble}
              onChange={e => setNewBodyDouble(e.target.checked)}
              className="accent-primary"
            />
            {newBodyDouble ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
            Body-double mode (avatars + silent cam, opt-in)
          </label>
          <div className="flex gap-2">
            <button
              onClick={createRoom}
              disabled={creating || !newName.trim()}
              className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
              className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="Join by code…"
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm uppercase tracking-widest text-center font-mono mb-3 disabled:opacity-50"
      />

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {rooms.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No rooms yet — create one</p>
        )}
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => !disabled && onChange(room.code)}
            disabled={disabled}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all',
              value === room.code
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-primary/5',
              disabled && 'opacity-50'
            )}
          >
            <div className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              room.active_count > 0 ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-muted-foreground/30'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{room.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {room.active_count}/{room.max_members} studying{room.body_double ? ' · body-double' : ''}
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{room.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
