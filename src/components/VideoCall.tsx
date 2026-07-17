import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VideoCallProps {
  channelName: string;
  userId: string;
  remoteUserId: string;
  remoteName: string;
  onClose: () => void;
  isOpen: boolean;
}

type SignalPayload = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  senderId: string;
  targetId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export default function VideoCall({ channelName, userId, remoteUserId, remoteName, onClose }: VideoCallProps) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'calling' | 'incoming' | 'connected' | 'ended' | 'error'>('idle');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  const sendSignal = async (payload: Omit<SignalPayload, 'senderId' | 'targetId'>) => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'webrtc',
      payload: { ...payload, senderId: userId, targetId: remoteUserId },
    });
  };

  const closeCall = (notify = true) => {
    if (notify) void sendSignal({ type: 'hangup' });
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current = null;
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatus('idle');
    onClose();
  };

  const preparePeer = async () => {
    if (peerRef.current) return peerRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      setStatus('connected');
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void sendSignal({ type: 'ice-candidate', candidate: event.candidate.toJSON() });
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        setError('The call connection was interrupted.');
        setStatus('error');
      }
    };
    peerRef.current = peer;
    return peer;
  };

  const applyPendingCandidates = async (peer: RTCPeerConnection) => {
    for (const candidate of pendingCandidatesRef.current) await peer.addIceCandidate(candidate);
    pendingCandidatesRef.current = [];
  };

  const startCall = async () => {
    try {
      const peer = await preparePeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal({ type: 'offer', offer });
      setStatus('calling');
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : 'Camera or microphone access was denied.');
      setStatus('error');
    }
  };

  const acceptCall = async () => {
    if (!incomingOffer) return;
    try {
      const peer = await preparePeer();
      await peer.setRemoteDescription(incomingOffer);
      await applyPendingCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal({ type: 'answer', answer });
      setIncomingOffer(null);
      setStatus('calling');
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : 'Unable to accept the call.');
      setStatus('error');
    }
  };

  useEffect(() => {
    const channel = supabase.channel(channelName);
    channelRef.current = channel;
    channel.on('broadcast', { event: 'webrtc' }, async ({ payload }: { payload: SignalPayload }) => {
      if (payload.senderId === userId || payload.targetId !== userId) return;
      if (payload.type === 'offer' && payload.offer) {
        setIncomingOffer(payload.offer);
        setStatus('incoming');
      } else if (payload.type === 'answer' && payload.answer && peerRef.current) {
        await peerRef.current.setRemoteDescription(payload.answer);
        await applyPendingCandidates(peerRef.current);
      } else if (payload.type === 'ice-candidate' && payload.candidate) {
        if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(payload.candidate);
        else pendingCandidatesRef.current.push(payload.candidate);
      } else if (payload.type === 'hangup') {
        closeCall(false);
      }
    }).subscribe((subscriptionStatus) => {
      subscribedRef.current = subscriptionStatus === 'SUBSCRIBED';
      if (subscriptionStatus === 'SUBSCRIBED' && isOpen) void startCall();
    });

    return () => {
      closeCall(false);
      void supabase.removeChannel(channel);
    };
  }, [channelName, remoteUserId, userId]);

  useEffect(() => {
    if (isOpen && subscribedRef.current && status === 'idle') void startCall();
  }, [isOpen, status]);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  };

  if (!isOpen && status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl" role="dialog" aria-modal="true" aria-label={`Video call with ${remoteName}`}>
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <div><p className="font-semibold">Video call</p><p className="text-sm text-slate-300">{status === 'incoming' ? `${remoteName} is calling` : remoteName}</p></div>
          <button type="button" onClick={() => closeCall()} className="rounded-full bg-red-600 p-2 hover:bg-red-700" aria-label="End call"><PhoneOff className="h-5 w-5" /></button>
        </div>
        <div className="relative aspect-video bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
          <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 h-28 w-40 rounded-lg bg-slate-800 object-cover" />
          {(status === 'starting' || status === 'calling') && <p className="absolute inset-0 flex items-center justify-center text-white">{status === 'starting' ? 'Starting call…' : `Calling ${remoteName}…`}</p>}
          {status === 'incoming' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/70 text-white"><p className="text-lg font-semibold">Incoming video call</p><button type="button" onClick={acceptCall} className="rounded-full bg-emerald-600 px-5 py-2 font-semibold hover:bg-emerald-700"><Phone className="mr-2 inline h-4 w-4" />Accept</button></div>}
          {(status === 'error' || status === 'ended') && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-red-200">{error || 'Call ended.'}</p>}
        </div>
        <div className="flex items-center justify-center gap-3 p-4">
          <button type="button" onClick={toggleMute} className="rounded-full bg-slate-700 p-3 text-white hover:bg-slate-600" aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff /> : <Mic />}</button>
          <button type="button" onClick={toggleCamera} className="rounded-full bg-slate-700 p-3 text-white hover:bg-slate-600" aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>{cameraOff ? <VideoOff /> : <Video />}</button>
          <button type="button" onClick={() => closeCall()} className="rounded-full bg-red-600 p-3 text-white hover:bg-red-700" aria-label="End call"><PhoneOff /></button>
        </div>
      </section>
    </div>
  );
}
