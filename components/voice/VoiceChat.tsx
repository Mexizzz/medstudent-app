'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, VolumeX, Volume2 } from 'lucide-react';
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
  members: VoiceMember[];
  onMembersUpdate?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VoiceChat({ roomId, myUserId, isRoomCreator, members, onMembersUpdate }: Props) {
  const [inVoice, setInVoice] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [isMutedByAdmin, setIsMutedByAdmin] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const signalPollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const lastSignalTime = useRef(Date.now());
  const connectedPeersRef = useRef<Set<string>>(new Set());
  const makingOfferRef = useRef<Set<string>>(new Set());

  const onlineMembers = members.filter(m => m.isOnline && m.userId !== myUserId && m.isMicOn);

  // Check if I'm muted by admin
  useEffect(() => {
    const me = members.find(m => m.userId === myUserId);
    if (me?.isMutedByAdmin && !isMutedByAdmin) {
      setIsMutedByAdmin(true);
      // Disable mic if admin-muted
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
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        connectedPeersRef.current.add(remoteUserId);
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        connectedPeersRef.current.delete(remoteUserId);
      }
    };

    // Add local tracks
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

  // When voice members change, create offers to new members
  useEffect(() => {
    if (!inVoice) return;

    for (const m of onlineMembers) {
      if (!connectedPeersRef.current.has(m.userId) && !makingOfferRef.current.has(m.userId)) {
        // Only the user with the "lesser" ID initiates to avoid collision
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

    // Clean up peers for members who left
    const onlineIds = new Set(onlineMembers.map(m => m.userId));
    for (const [peerId, pc] of peersRef.current.entries()) {
      if (!onlineIds.has(peerId)) {
        pc.close();
        peersRef.current.delete(peerId);
        connectedPeersRef.current.delete(peerId);
        audioElementsRef.current.get(peerId)?.pause();
        audioElementsRef.current.delete(peerId);
      }
    }
  }, [inVoice, onlineMembers, myUserId, createPeerConnection, sendSignal]);

  async function joinVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInVoice(true);
      setMicOn(true);

      // Tell server mic is on
      await fetch(`/api/study-rooms/${roomId}/voice/toggle-mic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMicOn: true }),
      });

      lastSignalTime.current = Date.now();
      // Start polling for signals
      signalPollRef.current = setInterval(handleSignals, 1500);
    } catch {
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  }

  function leaveVoice() {
    // Stop polling
    clearInterval(signalPollRef.current);

    // Close all peer connections
    for (const [, pc] of peersRef.current) {
      pc.close();
    }
    peersRef.current.clear();
    connectedPeersRef.current.clear();
    makingOfferRef.current.clear();

    // Stop audio elements
    for (const [, audio] of audioElementsRef.current) {
      audio.pause();
      audio.srcObject = null;
    }
    audioElementsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    setInVoice(false);
    setMicOn(false);

    // Tell server mic is off
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(signalPollRef.current);
      for (const [, pc] of peersRef.current) pc.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      // Tell server we left voice
      fetch(`/api/study-rooms/${roomId}/voice/toggle-mic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMicOn: false }),
      }).catch(() => {});
    };
  }, [roomId]);

  const voiceMembers = members.filter(m => m.isMicOn && m.isOnline);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-500" />
          Voice Chat
        </p>
        {inVoice && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      {/* Voice members list */}
      {voiceMembers.length > 0 && (
        <div className="space-y-2 mb-3">
          {voiceMembers.map(m => (
            <div key={m.userId} className="flex items-center justify-between py-1.5 px-2 bg-white rounded-lg">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                  m.userId === myUserId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                )}>
                  {(m.userName || '?')[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-700">
                  {m.userId === myUserId ? 'You' : (m.userName || 'Anonymous')}
                </span>
                {m.isMutedByAdmin && (
                  <span className="text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded">Muted</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {m.isMutedByAdmin ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-500" />
                )}
                {isRoomCreator && m.userId !== myUserId && (
                  <button
                    onClick={() => adminMute(m.userId, !m.isMutedByAdmin)}
                    className={cn(
                      'ml-1 p-1 rounded text-xs transition-colors',
                      m.isMutedByAdmin
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-red-500 hover:bg-red-50'
                    )}
                    title={m.isMutedByAdmin ? 'Unmute' : 'Mute'}
                  >
                    {m.isMutedByAdmin ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!inVoice ? (
          <button
            onClick={joinVoice}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors w-full justify-center"
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
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center',
                micOn && !isMutedByAdmin
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              )}
              title={isMutedByAdmin ? 'Muted by room admin' : (micOn ? 'Mute' : 'Unmute')}
            >
              {micOn && !isMutedByAdmin ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {isMutedByAdmin ? 'Admin Muted' : (micOn ? 'Mute' : 'Unmute')}
            </button>
            <button
              onClick={leaveVoice}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              Leave
            </button>
          </>
        )}
      </div>

      {isMutedByAdmin && inVoice && (
        <p className="text-xs text-red-500 mt-2 text-center">You have been muted by the room admin.</p>
      )}
    </div>
  );
}
