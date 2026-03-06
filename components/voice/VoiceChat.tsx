'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, VolumeX, Volume2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMember {
  userId: string;
  userName: string | null;
  isOnline: boolean;
  isMicOn: boolean;
  isMutedByAdmin: boolean;
}

interface Props {
  roomId: string;
  myUserId: string;
  isRoomCreator: boolean;
  creatorId: string;
  members: VoiceMember[];
  onMembersUpdate?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Audio level analyzer — returns true if speaking
function useSpeakingDetector(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !enabled) {
      setSpeaking(false);
      return;
    }

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    let speakingTimeout: ReturnType<typeof setTimeout>;

    function check() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      if (avg > 15) {
        setSpeaking(true);
        clearTimeout(speakingTimeout);
        speakingTimeout = setTimeout(() => setSpeaking(false), 300);
      }
      rafRef.current = requestAnimationFrame(check);
    }
    check();

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(speakingTimeout);
      ctx.close();
      setSpeaking(false);
    };
  }, [stream, enabled]);

  return speaking;
}

export function VoiceChat({ roomId, myUserId, isRoomCreator, creatorId, members, onMembersUpdate }: Props) {
  const [inVoice, setInVoice] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [isMutedByAdmin, setIsMutedByAdmin] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const signalPollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const speakingPollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const lastSignalTime = useRef(Date.now());
  const connectedPeersRef = useRef<Set<string>>(new Set());
  const makingOfferRef = useRef<Set<string>>(new Set());

  const localSpeaking = useSpeakingDetector(localStreamRef.current, inVoice && micOn && !isMutedByAdmin);

  const onlineMembers = members.filter(m => m.isOnline && m.userId !== myUserId && m.isMicOn);
  const voiceMembers = members.filter(m => m.isMicOn && m.isOnline);

  // Detect speaking on remote streams
  useEffect(() => {
    if (!inVoice) return;

    const analysers = new Map<string, { analyser: AnalyserNode; ctx: AudioContext }>();

    for (const [peerId, stream] of remoteStreamsRef.current) {
      if (!analysers.has(peerId)) {
        try {
          const ctx = new AudioContext();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;
          source.connect(analyser);
          analysers.set(peerId, { analyser, ctx });
        } catch {}
      }
    }

    const data = new Uint8Array(128);
    speakingPollRef.current = setInterval(() => {
      const newSpeaking = new Set<string>();
      for (const [peerId, { analyser }] of analysers) {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > 15) newSpeaking.add(peerId);
      }
      setSpeakingPeers(newSpeaking);
    }, 150);

    return () => {
      clearInterval(speakingPollRef.current);
      for (const [, { ctx }] of analysers) ctx.close();
    };
  }, [inVoice, voiceMembers.length]);

  // Check if I'm muted by admin
  useEffect(() => {
    const me = members.find(m => m.userId === myUserId);
    if (me?.isMutedByAdmin && !isMutedByAdmin) {
      setIsMutedByAdmin(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      setMicOn(false);
    } else if (me && !me.isMutedByAdmin && isMutedByAdmin) {
      setIsMutedByAdmin(false);
    }
  }, [members, myUserId, isMutedByAdmin]);

  const sendSignal = useCallback(async (toUserId: string, type: string, payload: unknown) => {
    try {
      await fetch(`/api/study-rooms/${roomId}/voice/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId, type, payload: JSON.stringify(payload) }),
      });
    } catch {}
  }, [roomId]);

  const createPeerConnection = useCallback((remoteUserId: string) => {
    if (peersRef.current.has(remoteUserId)) {
      peersRef.current.get(remoteUserId)!.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(remoteUserId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      let audio = audioElementsRef.current.get(remoteUserId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioElementsRef.current.set(remoteUserId, audio);
      }
      audio.srcObject = event.streams[0];
      remoteStreamsRef.current.set(remoteUserId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        connectedPeersRef.current.add(remoteUserId);
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        connectedPeersRef.current.delete(remoteUserId);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peersRef.current.set(remoteUserId, pc);
    return pc;
  }, [sendSignal]);

  const handleSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/study-rooms/${roomId}/voice/signal?since=${lastSignalTime.current}`);
      if (!res.ok) return;
      const data = await res.json();
      lastSignalTime.current = data.serverTime;

      for (const signal of data.signals) {
        const { fromUserId, type, payload: rawPayload } = signal;
        const payload = JSON.parse(rawPayload);

        if (type === 'offer') {
          const pc = createPeerConnection(fromUserId);
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(fromUserId, 'answer', answer);
        } else if (type === 'answer') {
          const pc = peersRef.current.get(fromUserId);
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
          }
        } else if (type === 'ice-candidate') {
          const pc = peersRef.current.get(fromUserId);
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          }
        }
      }
    } catch {}
  }, [roomId, createPeerConnection, sendSignal]);

  useEffect(() => {
    if (!inVoice) return;

    for (const m of onlineMembers) {
      if (!connectedPeersRef.current.has(m.userId) && !makingOfferRef.current.has(m.userId)) {
        if (myUserId < m.userId) {
          makingOfferRef.current.add(m.userId);
          (async () => {
            try {
              const pc = createPeerConnection(m.userId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendSignal(m.userId, 'offer', offer);
            } catch {}
            makingOfferRef.current.delete(m.userId);
          })();
        }
      }
    }

    const onlineIds = new Set(onlineMembers.map(m => m.userId));
    for (const [peerId, pc] of peersRef.current.entries()) {
      if (!onlineIds.has(peerId)) {
        pc.close();
        peersRef.current.delete(peerId);
        connectedPeersRef.current.delete(peerId);
        audioElementsRef.current.get(peerId)?.pause();
        audioElementsRef.current.delete(peerId);
        remoteStreamsRef.current.delete(peerId);
      }
    }
  }, [inVoice, onlineMembers, myUserId, createPeerConnection, sendSignal]);

  async function joinVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInVoice(true);
      setMicOn(true);

      await fetch(`/api/study-rooms/${roomId}/voice/toggle-mic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMicOn: true }),
      });

      lastSignalTime.current = Date.now();
      signalPollRef.current = setInterval(handleSignals, 1500);
    } catch {
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  }

  function leaveVoice() {
    clearInterval(signalPollRef.current);
    clearInterval(speakingPollRef.current);

    for (const [, pc] of peersRef.current) pc.close();
    peersRef.current.clear();
    connectedPeersRef.current.clear();
    makingOfferRef.current.clear();

    for (const [, audio] of audioElementsRef.current) {
      audio.pause();
      audio.srcObject = null;
    }
    audioElementsRef.current.clear();
    remoteStreamsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    setInVoice(false);
    setMicOn(false);
    setSpeakingPeers(new Set());

    fetch(`/api/study-rooms/${roomId}/voice/toggle-mic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMicOn: false }),
    }).catch(() => {});
  }

  function toggleMic() {
    if (isMutedByAdmin) return;
    if (!localStreamRef.current) return;

    const newState = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = newState; });
    setMicOn(newState);

    fetch(`/api/study-rooms/${roomId}/voice/toggle-mic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMicOn: newState }),
    }).catch(() => {});
  }

  async function adminMute(targetUserId: string, muted: boolean) {
    await fetch(`/api/study-rooms/${roomId}/voice/admin-mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, muted }),
    });
    onMembersUpdate?.();
  }

  useEffect(() => {
    return () => {
      clearInterval(signalPollRef.current);
      clearInterval(speakingPollRef.current);
      for (const [, pc] of peersRef.current) pc.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      fetch(`/api/study-rooms/${roomId}/voice/toggle-mic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMicOn: false }),
      }).catch(() => {});
    };
  }, [roomId]);

  function isSpeaking(userId: string): boolean {
    if (userId === myUserId) return localSpeaking;
    return speakingPeers.has(userId);
  }

  return (
    <div className="bg-gradient-to-b from-[#1a1d2e] to-[#141621] rounded-2xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Voice Channel</span>
        </div>
        {inVoice && (
          <span className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">
            Connected
          </span>
        )}
      </div>

      {/* Members — vertical layout */}
      <div className="flex flex-wrap justify-center gap-4 mb-5">
        {voiceMembers.length === 0 && !inVoice && (
          <p className="text-xs text-white/30 py-6">No one in voice. Be the first to join!</p>
        )}
        {voiceMembers.map(m => {
          const speaking = isSpeaking(m.userId) && !m.isMutedByAdmin;
          const isMe = m.userId === myUserId;
          const isCreator = m.userId === creatorId;
          const muted = m.isMutedByAdmin;

          return (
            <div key={m.userId} className="flex flex-col items-center gap-1.5 w-16 group relative">
              {/* Avatar with speaking ring */}
              <div className="relative">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                    muted
                      ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40'
                      : speaking
                        ? 'bg-emerald-500/20 text-emerald-400 ring-[3px] ring-emerald-400 shadow-lg shadow-emerald-500/20'
                        : isMe
                          ? 'bg-indigo-500/20 text-indigo-400 ring-2 ring-indigo-500/30'
                          : 'bg-white/10 text-white/60 ring-2 ring-white/10'
                  )}
                >
                  {(m.userName || '?')[0].toUpperCase()}
                </div>

                {/* Speaking animation bars */}
                {speaking && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-[2px]">
                    <span className="w-[3px] h-[8px] bg-emerald-400 rounded-full animate-[soundbar1_0.5s_ease-in-out_infinite]" />
                    <span className="w-[3px] h-[12px] bg-emerald-400 rounded-full animate-[soundbar2_0.5s_ease-in-out_infinite_0.1s]" />
                    <span className="w-[3px] h-[6px] bg-emerald-400 rounded-full animate-[soundbar3_0.5s_ease-in-out_infinite_0.2s]" />
                  </div>
                )}

                {/* Muted icon overlay */}
                {muted && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#1a1d2e]">
                    <MicOff className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                {/* Mic off (self-muted, not admin) */}
                {!muted && isMe && !micOn && inVoice && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center border-2 border-[#1a1d2e]">
                    <MicOff className="w-2.5 h-2.5 text-white/70" />
                  </div>
                )}

                {/* Crown for room creator */}
                {isCreator && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
              </div>

              {/* Name */}
              <span className={cn(
                'text-[10px] font-medium truncate w-full text-center leading-tight',
                muted ? 'text-red-400/70' : isMe ? 'text-indigo-300/80' : 'text-white/50'
              )}>
                {isMe ? 'You' : (m.userName || 'Anon')}
              </span>

              {/* Admin mute button (hover) */}
              {isRoomCreator && !isMe && inVoice && (
                <button
                  onClick={() => adminMute(m.userId, !m.isMutedByAdmin)}
                  className={cn(
                    'absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border',
                    muted
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  )}
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin muted banner */}
      {isMutedByAdmin && inVoice && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3 text-center">
          <p className="text-xs text-red-400 font-medium">You have been muted by the room admin</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!inVoice ? (
          <button
            onClick={joinVoice}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-all w-full justify-center shadow-lg shadow-emerald-500/20"
          >
            <Phone className="w-4 h-4" />
            Join Voice
          </button>
        ) : (
          <>
            <button
              onClick={toggleMic}
              disabled={isMutedByAdmin}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl transition-all',
                micOn && !isMutedByAdmin
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
                isMutedByAdmin && 'opacity-50 cursor-not-allowed'
              )}
              title={isMutedByAdmin ? 'Muted by admin' : (micOn ? 'Mute' : 'Unmute')}
            >
              {micOn && !isMutedByAdmin ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={leaveVoice}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}
