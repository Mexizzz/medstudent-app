'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

type SoundKey = 'lofi' | 'rain' | 'cafe' | 'brown' | 'forest';

const SOUNDS: Array<{ key: SoundKey; label: string; emoji: string; url: string }> = [
  { key: 'lofi', label: 'Lofi', emoji: '🎧', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { key: 'rain', label: 'Rain', emoji: '🌧️', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_beb70fa7b5.mp3' },
  { key: 'cafe', label: 'Cafe', emoji: '☕', url: 'https://cdn.pixabay.com/download/audio/2024/04/14/audio_3fdd8c51f1.mp3' },
  { key: 'brown', label: 'Brown', emoji: '🟫', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8f6a2d63d8.mp3' },
  { key: 'forest', label: 'Forest', emoji: '🌲', url: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_c3b7a1b888.mp3' },
];

export function AmbientSounds() {
  const [volumes, setVolumes] = useState<Record<SoundKey, number>>({ lofi: 0, rain: 0, cafe: 0, brown: 0, forest: 0 });
  const [masterMuted, setMasterMuted] = useState(false);
  const audioRefs = useRef<Record<SoundKey, HTMLAudioElement | null>>({ lofi: null, rain: null, cafe: null, brown: null, forest: null });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('focus_ambient_v1');
      if (saved) setVolumes(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('focus_ambient_v1', JSON.stringify(volumes)); } catch {}
    SOUNDS.forEach(s => {
      const el = audioRefs.current[s.key];
      if (!el) return;
      const targetVol = masterMuted ? 0 : volumes[s.key] / 100;
      el.volume = targetVol;
      if (targetVol > 0 && el.paused) el.play().catch(() => {});
      if (targetVol === 0 && !el.paused) el.pause();
    });
  }, [volumes, masterMuted]);

  const anyOn = Object.values(volumes).some(v => v > 0);

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Music className="size-4 text-primary" />
          <span>Ambient</span>
        </div>
        <button
          onClick={() => setMasterMuted(m => !m)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label={masterMuted ? 'Unmute' : 'Mute'}
        >
          {masterMuted || !anyOn ? <VolumeX className="size-4" /> : <Volume2 className="size-4 text-primary" />}
        </button>
      </div>
      <div className="space-y-2">
        {SOUNDS.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-16 text-xs flex items-center gap-1.5">{s.emoji} {s.label}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volumes[s.key]}
              onChange={e => setVolumes(v => ({ ...v, [s.key]: Number(e.target.value) }))}
              className="flex-1 accent-primary"
            />
            <audio
              ref={el => { audioRefs.current[s.key] = el; }}
              src={s.url}
              loop
              preload="none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
