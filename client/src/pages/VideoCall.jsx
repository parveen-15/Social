import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

function PermissionError({ onRetry }) {
  const isMobileHttp = location.protocol !== 'https:' &&
    location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8 overflow-y-auto animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5 flex-shrink-0">
        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      {isMobileHttp ? (
        <>
          <h3 className="text-xl font-black text-white mb-2">Open via HTTPS</h3>
          <p className="text-white/40 text-sm mb-4 max-w-xs">
            Mobile browsers block camera on HTTP. Use the HTTPS link instead.
          </p>
          <div className="card p-4 border-accent/20 w-full max-w-xs text-left mb-5">
            <p className="text-accent text-xs font-bold mb-2 uppercase tracking-wider">Use this address:</p>
            <p className="font-mono text-accent/80 text-sm break-all">
              https://{location.hostname}:{location.port}
            </p>
            <p className="text-white/30 text-xs mt-2">Accept the "unsafe" warning once</p>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-xl font-black text-white mb-2">Camera Blocked</h3>
          <p className="text-white/40 text-sm mb-4 max-w-xs">
            Allow camera &amp; mic in your browser, then retry.
          </p>
          <div className="card p-4 border-white/10 w-full max-w-xs text-left mb-5">
            <p className="text-white/50 text-xs">Click the 🔒 lock in address bar → Site Settings → Camera &amp; Mic → <strong>Allow</strong></p>
          </div>
          <button onClick={onRetry} className="btn-primary px-8 py-2.5">Retry</button>
        </>
      )}
    </div>
  );
}

function IncomingCallBanner({ caller, onAccept, onDecline }) {
  return (
    <div className="absolute inset-x-0 top-0 z-50 p-4 animate-slide-up-1">
      <div className="max-w-sm mx-auto card border-accent/40 p-4"
        style={{ boxShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Avatar user={caller} size={12} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center animate-pulse">
              <svg className="w-2.5 h-2.5 text-bg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
              </svg>
            </span>
          </div>
          <div>
            <p className="text-white font-bold">{caller?.displayName}</p>
            <p className="text-accent text-sm animate-pulse">Incoming video call...</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            Decline
          </button>
          <button onClick={onAccept} className="flex-1 btn-primary py-2.5 text-sm">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoCall() {
  const { socket, currentUser, onlineUsers } = useApp();
  const [tab, setTab] = useState('random');
  const [status, setStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [timer, setTimer] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callMode, setCallMode] = useState('random');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);           // RTCPeerConnection
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const peerSocketId = useRef(null);    // socket id of the other person
  const iceCandidateQueue = useRef([]); // queue ICE until remote desc is set
  const remoteDescSet = useRef(false);

  const stopTimer = () => { clearInterval(timerRef.current); setTimer(0); };
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };
  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Whenever the local video element mounts (status → waiting/connected), attach stream
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [status]);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const isSecure = location.protocol === 'https:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure || !navigator.mediaDevices?.getUserMedia) {
      setStatus('permission_error'); return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      // element may not be in DOM yet (status still 'idle') — the useEffect above handles it
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      setStatus('permission_error'); return null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const closePc = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    remoteDescSet.current = false;
    iceCandidateQueue.current = [];
    peerSocketId.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    stopTimer();
  }, []);

  const flushIceCandidates = async () => {
    while (iceCandidateQueue.current.length) {
      const c = iceCandidateQueue.current.shift();
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  };

  const buildPc = useCallback((stream, targetSocketId, isInitiator) => {
    closePc();
    peerSocketId.current = targetSocketId;
    remoteDescSet.current = false;
    iceCandidateQueue.current = [];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket?.emit('video_signal', { to: targetSocketId, signal: { type: 'ice', candidate } });
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { setStatus('connected'); startTimer(); }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        closePc(); setStatus('ended');
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => socket?.emit('video_signal', { to: targetSocketId, signal: { type: 'offer', sdp: pc.localDescription } }))
        .catch(() => {});
    }

    return pc;
  }, [socket, closePc]);

  // ── Controls ──────────────────────────────────────────────────────────
  const handleStartRandom = async () => {
    const stream = await getLocalStream();
    if (!stream) return;
    setCallMode('random');
    setStatus('waiting');
    socket?.emit('join_video_queue');
  };

  const handleEnd = useCallback(() => {
    closePc();
    if (callMode === 'friend') socket?.emit('call_ended', { to: peerSocketId.current });
    else socket?.emit('video_end_call');
    setStatus('ended');
  }, [closePc, callMode, socket]);

  const handleNext = useCallback(() => {
    closePc();
    setStatus('waiting');
    socket?.emit('video_next');
  }, [closePc, socket]);

  const handleCallFriend = async (friend) => {
    const stream = await getLocalStream();
    if (!stream) return;
    setCallMode('friend');
    setStatus('waiting');
    socket?.emit('call_user', {
      targetUserId: friend._id,
      callerInfo: { _id: currentUser._id, displayName: currentUser.displayName, avatar: currentUser.avatar, username: currentUser.username },
    });
  };

  const handleAcceptCall = async () => {
    const call = incomingCall;
    setIncomingCall(null);
    const stream = await getLocalStream();
    if (!stream) return;
    setCallMode('friend');
    setStatus('waiting');
    peerSocketId.current = call.from;
    socket?.emit('call_accepted', { to: call.from });
    buildPc(stream, call.from, false); // non-initiator, wait for offer
  };

  const handleDeclineCall = () => {
    socket?.emit('call_declined', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const handleReport = () => {
    if (!reportReason.trim()) return;
    socket?.emit('video_report', { reportedId: peerSocketId.current, reason: reportReason });
    setShowReport(false); setReportReason('');
    handleNext();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(c => !c);
  };

  // ── Socket events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('video_waiting', () => setStatus('waiting'));

    socket.on('video_matched', async ({ peerId, isInitiator }) => {
      const stream = localStreamRef.current || await getLocalStream();
      if (!stream) return;
      buildPc(stream, peerId, isInitiator);
    });

    socket.on('video_signal', async ({ from, signal }) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        remoteDescSet.current = true;
        await flushIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('video_signal', { to: from, signal: { type: 'answer', sdp: pc.localDescription } });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        remoteDescSet.current = true;
        await flushIceCandidates();
      } else if (signal.type === 'ice') {
        if (remoteDescSet.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
        } else {
          iceCandidateQueue.current.push(signal.candidate);
        }
      }
    });

    socket.on('video_peer_left', () => { closePc(); setStatus('ended'); });

    socket.on('incoming_call', (data) => {
      setIncomingCall(prev => prev ?? data);
    });

    socket.on('call_accepted', async ({ from }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      buildPc(stream, from, true); // caller is initiator
    });

    socket.on('call_declined', () => {
      closePc(); stopLocalStream(); setStatus('idle');
    });

    socket.on('call_ended', () => { closePc(); setStatus('ended'); });

    socket.on('call_failed', () => {
      closePc(); stopLocalStream(); setStatus('idle');
    });

    return () => {
      ['video_waiting','video_matched','video_signal','video_peer_left',
       'incoming_call','call_accepted','call_declined','call_ended','call_failed']
        .forEach(e => socket.off(e));
    };
  }, [socket, buildPc, closePc, getLocalStream, stopLocalStream]);

  useEffect(() => {
    return () => {
      socket?.emit('leave_video_queue');
      closePc();
      stopLocalStream();
    };
  }, [closePc, stopLocalStream, socket]);

  const onlineFriends = (currentUser?.friends || []).filter(f => {
    const fid = f._id || f;
    return onlineUsers[fid] !== undefined ? onlineUsers[fid] : f.isOnline;
  });

  return (
    <div className="chat-height bg-bg flex flex-col relative overflow-hidden">

      {/* Incoming call banner */}
      {incomingCall && status !== 'connected' && (
        <IncomingCallBanner caller={incomingCall.callerInfo} onAccept={handleAcceptCall} onDecline={handleDeclineCall} />
      )}

      {/* Remote video */}
      <video ref={remoteVideoRef} autoPlay playsInline
        className={`absolute inset-0 w-full h-full object-cover ${status === 'connected' ? 'block' : 'hidden'}`} />

      {/* Overlay screens */}
      {status !== 'connected' && (
        <div className="flex flex-col h-full">

          {/* Tab bar */}
          {['idle','ended','permission_error'].includes(status) && (
            <div className="flex gap-2 p-4 border-b border-brd">
              {[{ id: 'random', label: '🎲 Random' }, { id: 'friends', label: '👥 Friends' }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    tab === t.id
                      ? 'bg-accent text-bg shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-card border border-brd text-white/40 hover:text-white'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center overflow-y-auto">

            {status === 'permission_error' && <PermissionError onRetry={() => { localStreamRef.current = null; setStatus('idle'); }} />}

            {/* Random mode */}
            {status !== 'permission_error' && tab === 'random' && status === 'idle' && (
              <div className="text-center px-8 animate-fade-in">
                <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 relative"
                  style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 0 40px rgba(6,182,212,0.5)' }}>
                  <svg className="w-14 h-14 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#06B6D4' }} />
                </div>
                <h2 className="text-3xl font-black mb-2">Random <span className="text-accent">Video</span></h2>
                <p className="text-white/40 text-sm mb-10">Match with a random online user</p>
                <button onClick={handleStartRandom} className="btn-primary text-lg px-12 py-4 rounded-2xl font-black">
                  🎥 Start Chatting
                </button>
              </div>
            )}

            {status !== 'permission_error' && status === 'waiting' && callMode === 'random' && (
              <div className="text-center animate-fade-in">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
                  <div className="absolute inset-3 rounded-full border-2 border-accent/50 animate-ping" style={{ animationDelay: '0.3s' }} />
                  <div className="w-28 h-28 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 0 30px rgba(6,182,212,0.4)' }}>
                    <svg className="w-12 h-12 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl font-black text-white">Finding someone...</p>
                <p className="text-white/30 text-sm mt-2">Waiting for another user to join</p>
                <button onClick={() => { socket?.emit('leave_video_queue'); setStatus('idle'); stopLocalStream(); }}
                  className="mt-8 btn-secondary px-8 py-2.5 text-sm">Cancel</button>
              </div>
            )}

            {status !== 'permission_error' && status === 'waiting' && callMode === 'friend' && (
              <div className="text-center animate-fade-in">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
                  <div className="w-28 h-28 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 0 30px rgba(6,182,212,0.4)' }}>
                    <svg className="w-12 h-12 text-bg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl font-black text-white">Calling...</p>
                <p className="text-white/30 text-sm mt-2">Waiting for them to accept</p>
                <button onClick={() => { socket?.emit('call_ended', { to: peerSocketId.current }); closePc(); stopLocalStream(); setStatus('idle'); }}
                  className="mt-8 btn-secondary px-8 py-2.5 text-sm">Cancel</button>
              </div>
            )}

            {status !== 'permission_error' && status === 'ended' && (
              <div className="text-center animate-fade-in px-8">
                <div className="text-5xl mb-6">👋</div>
                <p className="text-xl font-black mb-2">Call ended</p>
                <p className="text-white/30 text-sm mb-8">Hope you had a great chat!</p>
                <div className="flex gap-4 justify-center">
                  {callMode === 'random'
                    ? <button onClick={handleStartRandom} className="btn-primary px-8 py-3 font-bold">Find Next</button>
                    : <button onClick={() => { setStatus('idle'); setTab('friends'); }} className="btn-primary px-8 py-3 font-bold">Call Again</button>}
                  <button onClick={() => { setStatus('idle'); stopLocalStream(); }} className="btn-secondary px-8 py-3">Go Back</button>
                </div>
              </div>
            )}

            {/* Friends tab */}
            {status !== 'permission_error' && tab === 'friends' && ['idle','ended'].includes(status) && (
              <div className="w-full max-w-md px-4 py-4 animate-fade-in">
                <div className="mb-4 text-center">
                  <p className="text-lg font-black text-white">Call a Friend</p>
                  <p className="text-xs text-white/30">Only online friends shown</p>
                </div>
                {onlineFriends.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">😴</div>
                    <p className="font-bold text-white/30">No friends online</p>
                    <p className="text-sm text-white/20 mt-1">Ask a friend to log in first</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onlineFriends.map((friend, i) => (
                      <div key={friend._id || i} className="card p-4 flex items-center gap-3 border-brd"
                        style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}>
                        <div className="relative">
                          <Avatar user={friend} size={12} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-card" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{friend.displayName}</p>
                          <p className="text-xs text-green-400">● Online</p>
                        </div>
                        <button onClick={() => handleCallFriend(friend)} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Call
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local PiP */}
      {['connected','waiting'].includes(status) && (
        <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden z-10"
          style={{ border: '2px solid rgba(6,182,212,0.4)', boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          {camOff && (
            <div className="absolute inset-0 bg-card flex items-center justify-center">
              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Timer */}
      {status === 'connected' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-sm font-bold text-accent"
          style={{ background: 'rgba(11,15,20,0.85)', border: '1px solid rgba(6,182,212,0.3)' }}>
          ● {formatTime(timer)}
        </div>
      )}

      {/* Controls */}
      {status === 'connected' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
          <button onClick={toggleMute}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-500' : 'bg-black/50 border border-white/20'}`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {muted
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />}
            </svg>
          </button>

          <button onClick={handleEnd}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </button>

          <button onClick={toggleCam}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${camOff ? 'bg-red-500' : 'bg-black/50 border border-white/20'}`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {callMode === 'random' && (
            <button onClick={handleNext}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-accent/40 flex items-center justify-center text-accent font-black text-xs"
              style={{ background: 'rgba(6,182,212,0.15)' }}>
              Next
            </button>
          )}
          {callMode === 'random' && (
            <button onClick={() => setShowReport(true)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/50 border border-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {showReport && (
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-20 p-4">
          <div className="card p-6 w-full max-w-sm border-brd animate-slide-up-1">
            <h3 className="text-lg font-black text-white mb-5">Report User</h3>
            <div className="space-y-3 mb-5">
              {['Inappropriate content','Harassment','Spam','Nudity','Other'].map(r => (
                <label key={r} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="reason" value={r} onChange={e => setReportReason(e.target.value)} className="accent-accent w-4 h-4" />
                  <span className="text-sm text-white/60">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReport(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button onClick={handleReport} disabled={!reportReason} className="flex-1 btn-primary py-2.5 text-sm">Report & Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
