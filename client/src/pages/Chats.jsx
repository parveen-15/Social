import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  getConversations, getConversation, getMessages, markRead,
  deleteConversation, recallMessage, deleteMessageForMe, sendMediaMessage,
} from '../utils/api';
import Avatar from '../components/Avatar';

const RECALL_MS = 3 * 60 * 1000;
const PLACEHOLDER_TTL = 8000;

const EMOJIS = ['😀','😂','🥰','😍','😎','🤔','😅','😭','🥺','😤','🎉','👍','👏','🙏','❤️','🔥','✨','💯','😊','🤣','😢','💪','👀','🎊'];

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const formatCallTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function timeAgo(date) {
  if (!date) return '';
  const d = (Date.now() - new Date(date)) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

function canRecall(msg) {
  return !msg.recalled && (Date.now() - new Date(msg.createdAt)) < RECALL_MS;
}

/* ── Emoji picker ────────────────────────────────────────────── */
function EmojiPicker({ onPick, onClose }) {
  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 card border-brd shadow-2xl p-3 animate-slide-up-1"
      style={{ width: 220 }}>
      <div className="grid grid-cols-6 gap-1">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => { onPick(e); onClose(); }}
            className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition-colors leading-none">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Message action menu ─────────────────────────────────────── */
function MsgMenu({ msg, isMine, onRecall, onDeleteForMe, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref}
      className="absolute top-full mt-1 z-50 card border-brd shadow-2xl min-w-[150px] py-1 rounded-xl overflow-hidden animate-fade-in"
      style={{ [isMine ? 'right' : 'left']: 0 }}>
      {isMine && canRecall(msg) && (
        <button onClick={() => { onRecall(msg); onClose(); }}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span className="text-amber-400 font-medium">Recall</span>
        </button>
      )}
      <button onClick={() => { onDeleteForMe(msg); onClose(); }}
        className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors">
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="text-red-400 font-medium">Delete for me</span>
      </button>
    </div>
  );
}

/* ── Single message bubble ───────────────────────────────────── */
function MessageBubble({ msg, isMine, otherUser, onMenuOpen, onEditRecalled, menuOpen }) {
  const hasImage = !!msg.image;
  const hasVideo = !!msg.video;
  const hasMedia = hasImage || hasVideo;

  const [imgOpen, setImgOpen] = useState(false);

  const bubbleBase = `relative max-w-[72vw] sm:max-w-xs lg:max-w-md rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-200 ${
    isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
  }`;

  const bubbleColor = isMine
    ? 'bg-accent text-bg shadow-[0_2px_12px_rgba(6,182,212,0.35)]'
    : 'bg-[#1e2535] text-white border border-white/8';

  const handleLongPress = (() => {
    let timer;
    return {
      onTouchStart: () => { timer = setTimeout(() => onMenuOpen(msg._id), 500); },
      onTouchEnd: () => clearTimeout(timer),
      onContextMenu: (e) => { e.preventDefault(); onMenuOpen(msg._id); },
      onDoubleClick: () => onMenuOpen(msg._id),
    };
  })();

  return (
    <div className="relative">
      {/* Image lightbox */}
      {imgOpen && hasImage && (
        <div className="fixed inset-0 bg-bg/95 z-[100] flex items-center justify-center p-4"
          onClick={() => setImgOpen(false)}>
          <img src={msg.image} className="max-w-full max-h-full rounded-xl object-contain" alt="" />
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">✕</button>
        </div>
      )}

      <div className={`${bubbleBase} ${bubbleColor}`} {...handleLongPress}>
        {hasImage && (
          <div className="relative" onClick={() => setImgOpen(true)}>
            <img src={msg.image} className="w-full max-h-60 object-cover block" alt="img" />
          </div>
        )}
        {hasVideo && (
          <video src={msg.video} controls className="w-full max-h-60 block" />
        )}
        {msg.text && (
          <p className={`px-3.5 py-2.5 text-sm leading-relaxed ${hasMedia ? 'border-t border-white/10' : ''}`}>
            {msg.text}
          </p>
        )}
        {!hasMedia && !msg.text && (
          <p className="px-3.5 py-2.5 text-sm italic opacity-50">—</p>
        )}
      </div>

      {/* Edit & resend hint for sender's recalled msg — not rendered here, handled above */}
    </div>
  );
}

/* ── Media preview bar ───────────────────────────────────────── */
function MediaPreview({ file, preview, type, progress, onRemove }) {
  return (
    <div className="relative mx-4 mb-2 rounded-xl overflow-hidden border border-brd bg-card">
      {type === 'image' ? (
        <img src={preview} className="max-h-40 w-full object-contain bg-bg" alt="" />
      ) : (
        <video src={preview} className="max-h-40 w-full bg-bg" controls />
      )}
      {progress > 0 && progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button onClick={onRemove}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bg/80 text-white flex items-center justify-center text-lg leading-none hover:bg-red-500 transition-colors">
        ✕
      </button>
      <div className="absolute bottom-2 left-2 text-xs text-white/50 bg-bg/60 px-2 py-0.5 rounded-full">
        {file?.name?.length > 20 ? file.name.slice(0, 17) + '…' : file?.name}
      </div>
    </div>
  );
}

/* ── Incoming call banner ────────────────────────────────────── */
function IncomingCallBanner({ caller, onAccept, onDecline }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[300] p-4 animate-slide-up-1">
      <div className="max-w-sm mx-auto card border-accent/40 p-4 shadow-2xl"
        style={{ boxShadow: '0 0 40px rgba(6,182,212,0.35)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Avatar user={caller} size={12} />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center animate-pulse">
              <svg className="w-3 h-3 text-bg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
              </svg>
            </span>
          </div>
          <div>
            <p className="text-white font-bold">{caller?.displayName}</p>
            <p className="text-accent text-sm animate-pulse">Incoming voice call…</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
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

/* ── Active voice call overlay ───────────────────────────────── */
function CallOverlay({ callState, callWith, muted, timer, onMute, onEnd }) {
  return (
    <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0d1a2e 0%, #0b0f14 100%)' }}>

      {/* Pulsing rings */}
      <div className="relative flex items-center justify-center mb-8">
        {callState === 'connected' && (
          <>
            <div className="absolute w-40 h-40 rounded-full border border-accent/10 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute w-52 h-52 rounded-full border border-accent/5 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          </>
        )}
        {callState !== 'connected' && (
          <>
            <div className="absolute w-36 h-36 rounded-full border-2 border-accent/20 animate-ping" />
            <div className="absolute w-48 h-48 rounded-full border border-accent/10 animate-ping" style={{ animationDelay: '0.4s' }} />
          </>
        )}
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 z-10"
          style={{ borderColor: 'rgba(6,182,212,0.5)', boxShadow: '0 0 40px rgba(6,182,212,0.3)' }}>
          <Avatar user={callWith} size={28} />
        </div>
      </div>

      <p className="text-2xl font-black text-white mb-2">{callWith?.displayName}</p>

      {callState === 'connected' ? (
        <p className="text-accent text-sm font-medium mb-10">{formatCallTime(timer)}</p>
      ) : (
        <p className="text-white/40 text-sm mb-10 animate-pulse">
          {callState === 'calling' ? 'Ringing…' : 'Connecting…'}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <button onClick={onMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.5)]' : 'bg-white/10 border border-white/20 hover:bg-white/15'}`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {muted
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />}
            </svg>
          </button>
          <span className="text-[10px] text-white/30">{muted ? 'Unmute' : 'Mute'}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.5)] hover:bg-red-600 transition-colors">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </button>
          <span className="text-[10px] text-white/30">End</span>
        </div>
      </div>
    </div>
  );
}

/* ── Chat window ─────────────────────────────────────────────── */
function ChatWindow({ conversation, onBack, onConversationDeleted, onCallUser }) {
  const { currentUser, socket } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [showDeleteConv, setShowDeleteConv] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [editingText, setEditingText] = useState(null); // non-null = editing a recalled msg
  const [editingMsgId, setEditingMsgId] = useState(null); // which recalled msg is being edited

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const fileRef = useRef();
  const recallTimers = useRef({});
  const inputRef = useRef();

  const other = conversation.participants?.find(p => p._id !== currentUser._id);

  const loadMessages = useCallback(async () => {
    if (!conversation._id) return;
    try {
      const res = await getMessages(conversation._id, currentUser._id);
      setMessages(res.data);
    } catch {}
  }, [conversation._id, currentUser._id]);

  useEffect(() => {
    loadMessages();
    markRead(conversation._id, currentUser._id).catch(() => {});
    socket?.emit('join_conversation', conversation._id);

    const handleMsg = (msg) => {
      if (msg.conversation === conversation._id || msg.conversation?._id === conversation._id) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        markRead(conversation._id, currentUser._id).catch(() => {});
      }
    };
    const handleTyping = ({ userId, isTyping }) => {
      if (userId !== currentUser._id) setTyping(isTyping);
    };
    const handleRecalled = ({ msgId }) => {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, recalled: true, text: '' } : m));
      // Auto-remove placeholder after 8 seconds
      recallTimers.current[msgId] = setTimeout(() => {
        setMessages(prev => prev.filter(m => m._id !== msgId));
      }, PLACEHOLDER_TTL);
    };

    socket?.on('new_message', handleMsg);
    socket?.on('user_typing', handleTyping);
    socket?.on('message_recalled', handleRecalled);
    return () => {
      socket?.off('new_message', handleMsg);
      socket?.off('user_typing', handleTyping);
      socket?.off('message_recalled', handleRecalled);
    };
  }, [conversation._id, socket, currentUser._id, loadMessages]);

  // Clean up recall timers on unmount
  useEffect(() => () => { Object.values(recallTimers.current).forEach(clearTimeout); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async (e) => {
    e?.preventDefault();
    const hasText = text.trim();
    const isEditing = editingText !== null;

    if (mediaFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        await sendMediaMessage(
          { conversationId: conversation._id, senderId: currentUser._id, text: text.trim(), file: mediaFile },
          setUploadProgress,
        );
        clearMedia();
        setText('');
      } catch (err) {
        const errMsg = err?.response?.data?.error || 'Failed to send — try a smaller file or different format.';
        alert(errMsg);
      }
      setUploading(false);
      return;
    }

    if (!hasText) return;
    socket?.emit('send_message', { conversationId: conversation._id, senderId: currentUser._id, text: text.trim() });
    setText('');
    setEditingText(null);
    setEditingMsgId(null);
    socket?.emit('typing', { conversationId: conversation._id, userId: currentUser._id, isTyping: false });
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(vid.src);
        if (vid.duration > 180) {
          alert('Video must be 3 minutes or shorter. Please trim it first.');
          if (fileRef.current) fileRef.current.value = '';
          return;
        }
        setMediaFile(file);
        setMediaType('video');
        setMediaPreview(URL.createObjectURL(file));
      };
      vid.src = URL.createObjectURL(file);
    } else {
      setMediaFile(file);
      setMediaType('image');
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleTypingInput = (e) => {
    setText(e.target.value);
    socket?.emit('typing', { conversationId: conversation._id, userId: currentUser._id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit('typing', { conversationId: conversation._id, userId: currentUser._id, isTyping: false });
    }, 1500);
  };

  const handleRecall = async (msg) => {
    const originalContent = msg.text || '';
    try {
      await recallMessage(msg._id, currentUser._id);
      if (originalContent) {
        setEditingText(originalContent);
        setEditingMsgId(msg._id);
        setText(originalContent);
        inputRef.current?.focus();
      }
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, recalled: true, text: '' } : m));
      recallTimers.current[msg._id] = setTimeout(() => {
        setMessages(prev => prev.filter(m => m._id !== msg._id));
      }, PLACEHOLDER_TTL);
    } catch (err) {
      alert(err?.response?.data?.error || 'Cannot recall this message');
    }
  };

  const handleDeleteForMe = async (msg) => {
    try {
      await deleteMessageForMe(msg._id, currentUser._id);
      setMessages(prev => prev.filter(m => m._id !== msg._id));
    } catch {}
  };

  const handleDeleteConversation = async () => {
    try {
      await deleteConversation(conversation._id);
      onConversationDeleted(conversation._id);
    } catch {}
  };

  const canSend = (text.trim() || mediaFile) && !uploading;

  return (
    <div className="flex flex-col h-full bg-[#0b0f14]" onClick={() => { setMenuMsgId(null); setShowEmoji(false); }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111827] border-b border-white/8 flex-shrink-0">
        <button onClick={onBack} className="md:hidden text-white/40 hover:text-accent transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="relative flex-shrink-0" onClick={(e) => { e.stopPropagation(); const id = other?.username || other?._id; if (id) navigate(`/user/${id}`); }}>
          <Avatar user={other} size={10} />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111827] ${other?.isOnline ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-white/10'}`} />
        </button>
        <button className="flex-1 text-left min-w-0"
          onClick={(e) => { e.stopPropagation(); const id = other?.username || other?._id; if (id) navigate(`/user/${id}`); }}>
          <p className="font-bold text-white text-sm hover:text-accent transition-colors truncate">{other?.displayName}</p>
          <p className={`text-xs font-medium ${other?.isOnline ? 'text-green-400' : 'text-white/30'}`}>
            {other?.isOnline ? '● Online' : 'Offline'}
          </p>
        </button>
        {/* Voice call button */}
        <button onClick={(e) => { e.stopPropagation(); onCallUser?.(other); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-accent hover:bg-accent/10 transition-all"
          title="Voice call">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
        </button>

        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConv(true); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 scroll-smooth"
        style={{ background: 'radial-gradient(ellipse at top, #0d1520 0%, #0b0f14 100%)' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
              <Avatar user={other} size={14} />
            </div>
            <p className="font-bold text-white/50 text-base">{other?.displayName}</p>
            <p className="text-white/20 text-sm mt-1">Say hello! 👋</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.sender?._id === currentUser._id || msg.sender === currentUser._id;
          const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender?._id !== msg.sender?._id);
          const isRecalled = msg.recalled;

          return (
            <div key={msg._id || i}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
              style={{ animation: 'slideUp 0.25s ease-out both' }}>

              {/* Avatar for other user's messages */}
              {!isMine && (
                <div className={`w-7 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                  <Avatar user={other} size={7} />
                </div>
              )}

              {/* Bubble wrapper */}
              <div className={`relative flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>

                {/* Recalled placeholder */}
                {isRecalled ? (
                  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs italic border ${
                    isMine
                      ? 'bg-white/4 border-white/8 text-white/30 rounded-br-sm'
                      : 'bg-white/4 border-white/8 text-white/30 rounded-bl-sm'
                  }`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Message recalled
                    {isMine && editingMsgId === msg._id && (
                      <button onClick={() => { setText(editingText); inputRef.current?.focus(); }}
                        className="ml-2 text-accent font-semibold not-italic hover:underline">
                        Edit & resend
                      </button>
                    )}
                  </div>
                ) : (
                  <MessageBubble
                    msg={msg}
                    isMine={isMine}
                    otherUser={other}
                    menuOpen={menuMsgId === msg._id}
                    onMenuOpen={(id) => setMenuMsgId(prev => prev === id ? null : id)}
                    onEditRecalled={() => { setText(msg.text); setEditingText(msg.text); inputRef.current?.focus(); }}
                  />
                )}

                {/* Action menu — shows below message */}
                {menuMsgId === msg._id && !isRecalled && (
                  <MsgMenu
                    msg={msg}
                    isMine={isMine}
                    onRecall={handleRecall}
                    onDeleteForMe={handleDeleteForMe}
                    onClose={() => setMenuMsgId(null)}
                  />
                )}

                {/* Timestamp */}
                <span className={`text-[10px] text-white/20 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {timeAgo(msg.createdAt)}
                  {isMine && msg.read && <span className="ml-1 text-accent">✓✓</span>}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-end gap-2">
            <div className="w-7 flex-shrink-0"><Avatar user={other} size={7} /></div>
            <div className="bg-[#1e2535] border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Editing banner */}
      {editingText !== null && (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-t border-accent/20 flex-shrink-0">
          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-accent text-xs font-medium flex-1">Editing recalled message</span>
          <button onClick={() => { setEditingText(null); setEditingMsgId(null); setText(''); }} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
        </div>
      )}

      {/* Media preview */}
      {mediaPreview && (
        <MediaPreview file={mediaFile} preview={mediaPreview} type={mediaType} progress={uploadProgress} onRemove={clearMedia} />
      )}

      {/* ── Input ─────────────────────────────────────────────── */}
      <form onSubmit={sendMsg} onClick={e => e.stopPropagation()}
        className="flex items-end gap-2 px-3 py-3 bg-[#111827] border-t border-white/8 flex-shrink-0 relative">

        {/* Emoji picker */}
        <div className="relative flex-shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xl text-white/30 hover:text-accent hover:bg-white/5 transition-all">
            😊
          </button>
          {showEmoji && (
            <EmojiPicker onPick={(e) => setText(t => t + e)} onClose={() => setShowEmoji(false)} />
          )}
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTypingInput}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
            placeholder={editingText !== null ? 'Edit your message…' : 'Message…'}
            rows={1}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:bg-white/8 transition-all resize-none overflow-hidden leading-5"
            style={{ maxHeight: 120, minHeight: 40 }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        {/* Attach media */}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-accent hover:bg-white/5 transition-all flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

        {/* Send button */}
        <button type="submit" disabled={!canSend}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            canSend
              ? 'bg-accent text-bg shadow-[0_0_16px_rgba(6,182,212,0.5)] hover:scale-105'
              : 'bg-white/5 text-white/20'
          }`}>
          {uploading ? (
            <div className="w-4 h-4 border-2 border-bg/60 border-t-bg rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </form>

      {/* Upload progress bar */}
      {uploading && (
        <div className="h-0.5 bg-white/5 flex-shrink-0">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {/* Delete conversation confirm */}
      {showDeleteConv && (
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="card p-6 w-full max-w-xs border-brd animate-slide-up-1 shadow-2xl">
            <div className="text-3xl mb-3 text-center">🗑️</div>
            <h3 className="text-base font-black text-white text-center mb-2">Delete Chat?</h3>
            <p className="text-white/40 text-sm text-center mb-5">This permanently deletes all messages. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConv(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button onClick={handleDeleteConversation}
                className="flex-1 py-2.5 text-sm rounded-xl font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Conversation preview in sidebar ────────────────────────── */
function ConvPreview({ conv, isSelected, currentUserId, onClick }) {
  const other = conv.participants?.find(p => p._id !== currentUserId);
  const last = conv.lastMessage;
  const preview = last?.recalled ? 'Message recalled'
    : last?.video ? '📹 Video'
    : last?.image ? '📷 Photo'
    : last?.text || 'Say hello! 👋';

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 border-b border-white/5 ${
        isSelected ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-white/4'
      }`}>
      <div className="relative flex-shrink-0">
        <Avatar user={other} size={12} />
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111827] ${other?.isOnline ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]' : 'bg-white/10'}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center gap-2">
          <p className="font-semibold text-sm text-white truncate">{other?.displayName}</p>
          <span className="text-[10px] text-white/20 flex-shrink-0">{timeAgo(conv.lastMessageTime)}</span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${last?.recalled ? 'italic text-white/20' : 'text-white/30'}`}>
          {preview}
        </p>
      </div>
    </button>
  );
}

/* ── Root Chats page ─────────────────────────────────────────── */
export default function Chats() {
  const { currentUser, socket, notifications } = useApp();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Call state ────────────────────────────────────────────────
  const [callState, setCallState] = useState(null); // null | 'calling' | 'connecting' | 'connected'
  const [callWith, setCallWith] = useState(null);   // other user object
  const [incomingCall, setIncomingCall] = useState(null); // { from, callerInfo }
  const [muted, setMuted] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [callError, setCallError] = useState('');

  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerSocketIdRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const remoteDescSet = useRef(false);
  const timerInterval = useRef(null);

  const startTimer = () => {
    clearInterval(timerInterval.current);
    setCallTimer(0);
    timerInterval.current = setInterval(() => setCallTimer(t => t + 1), 1000);
  };
  const stopTimer = () => { clearInterval(timerInterval.current); setCallTimer(0); };

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure || !navigator.mediaDevices?.getUserMedia) {
      setCallError('Camera access requires HTTPS. Try localhost or an HTTPS link.'); return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      return stream;
    } catch {
      setCallError('Could not access camera/mic. Please allow permission and retry.'); return null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  const closePc = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    remoteDescSet.current = false;
    iceCandidateQueue.current = [];
    peerSocketIdRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null; remoteAudioRef.current.pause(); }
    stopTimer();
  }, []);

  const flushIce = async () => {
    while (iceCandidateQueue.current.length) {
      const c = iceCandidateQueue.current.shift();
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  };

  const buildPc = useCallback((stream, targetSocketId, isInitiator) => {
    closePc();
    peerSocketIdRef.current = targetSocketId;
    remoteDescSet.current = false;
    iceCandidateQueue.current = [];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket?.emit('video_signal', { to: targetSocketId, signal: { type: 'ice', candidate } });
    };
    pc.ontrack = ({ streams }) => {
      remoteStreamRef.current = streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { setCallState('connected'); startTimer(); }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        closePc(); stopLocalStream(); setCallState(null); setCallWith(null);
      }
    };
    if (isInitiator) {
      pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .then(() => socket?.emit('video_signal', { to: targetSocketId, signal: { type: 'offer', sdp: pc.localDescription } }))
        .catch(() => {});
    }
    return pc;
  }, [socket, closePc, stopLocalStream]);

  // When audio element mounts (callState changes), attach any pending remote stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [callState]);

  const handleStartCall = useCallback(async (otherUser) => {
    if (!otherUser?._id) return;
    setCallError('');
    const stream = await getLocalStream();
    if (!stream) return;
    setCallWith(otherUser);
    setCallState('calling');
    socket?.emit('call_user', {
      targetUserId: otherUser._id,
      callerInfo: { _id: currentUser._id, displayName: currentUser.displayName, avatar: currentUser.avatar, username: currentUser.username },
    });
  }, [socket, currentUser, getLocalStream]);

  const handleAcceptCall = useCallback(async () => {
    const call = incomingCall;
    setIncomingCall(null);
    setCallError('');
    const stream = await getLocalStream();
    if (!stream) return;
    setCallWith(call.callerInfo);
    setCallState('connecting');
    peerSocketIdRef.current = call.from;
    socket?.emit('call_accepted', { to: call.from });
    buildPc(stream, call.from, false);
  }, [incomingCall, socket, getLocalStream, buildPc]);

  const handleDeclineCall = useCallback(() => {
    socket?.emit('call_declined', { to: incomingCall?.from });
    setIncomingCall(null);
  }, [socket, incomingCall]);

  const handleEndCall = useCallback(() => {
    if (peerSocketIdRef.current) socket?.emit('call_ended', { to: peerSocketIdRef.current });
    closePc();
    stopLocalStream();
    setCallState(null);
    setCallWith(null);
  }, [socket, closePc, stopLocalStream]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };

  // ── Call socket events ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data) => setIncomingCall(prev => prev ?? data);

    const onAccepted = async ({ from }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      buildPc(stream, from, true);
    };

    const onDeclined = () => {
      closePc(); stopLocalStream(); setCallState(null); setCallWith(null);
    };

    const onEnded = () => {
      closePc(); stopLocalStream(); setCallState(null); setCallWith(null);
    };

    const onFailed = () => {
      closePc(); stopLocalStream(); setCallState(null); setCallWith(null);
    };

    const onSignal = async ({ from, signal }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        remoteDescSet.current = true;
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('video_signal', { to: from, signal: { type: 'answer', sdp: pc.localDescription } });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        remoteDescSet.current = true;
        await flushIce();
      } else if (signal.type === 'ice') {
        if (remoteDescSet.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
        } else {
          iceCandidateQueue.current.push(signal.candidate);
        }
      }
    };

    socket.on('incoming_call', onIncoming);
    socket.on('call_accepted', onAccepted);
    socket.on('call_declined', onDeclined);
    socket.on('call_ended', onEnded);
    socket.on('call_failed', onFailed);
    socket.on('video_signal', onSignal);

    return () => {
      socket.off('incoming_call', onIncoming);
      socket.off('call_accepted', onAccepted);
      socket.off('call_declined', onDeclined);
      socket.off('call_ended', onEnded);
      socket.off('call_failed', onFailed);
      socket.off('video_signal', onSignal);
    };
  }, [socket, buildPc, closePc, stopLocalStream]);

  // Cleanup on unmount
  useEffect(() => () => { closePc(); stopLocalStream(); }, [closePc, stopLocalStream]);

  // ── Conversations ─────────────────────────────────────────────
  const fetchConvs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await getConversations(currentUser._id);
      setConversations(res.data);
    } catch {}
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchConvs(); }, [fetchConvs]);
  useEffect(() => { if (notifications.length > 0) fetchConvs(); }, [notifications, fetchConvs]);
  useEffect(() => {
    socket?.on('conversation_updated', fetchConvs);
    return () => socket?.off('conversation_updated', fetchConvs);
  }, [socket, fetchConvs]);

  const handleConvDeleted = (convId) => {
    setConversations(prev => prev.filter(c => c._id !== convId));
    setSelected(null);
  };

  return (
    <div className="flex chat-height overflow-hidden relative">

      {/* ── Incoming call banner ───────────────────────────────── */}
      {incomingCall && !callState && (
        <IncomingCallBanner
          caller={incomingCall.callerInfo}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* ── Active call overlay ───────────────────────────────── */}
      {callState && (
        <>
          {/* Audio element at root level so it mounts immediately with callState */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          <CallOverlay
            callState={callState}
            callWith={callWith}
            muted={muted}
            timer={callTimer}
            onMute={toggleMute}
            onEnd={handleEndCall}
          />
        </>
      )}

      {/* Camera permission error toast */}
      {callError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[400] bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-5 py-3 rounded-2xl shadow-xl max-w-xs text-center">
          {callError}
          <button onClick={() => setCallError('')} className="ml-3 text-red-300/60 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 bg-[#111827] border-r border-white/8`}>
        <div className="px-4 py-4 border-b border-white/8 flex-shrink-0">
          <h1 className="text-lg font-black text-white tracking-tight">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/8 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/8 rounded-full w-28" />
                    <div className="h-2 bg-white/5 rounded-full w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-4 animate-fade-in">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-bold text-white/30 text-sm">No conversations yet</p>
            </div>
          ) : conversations.map((conv, i) => (
            <ConvPreview
              key={conv._id}
              conv={conv}
              isSelected={selected?._id === conv._id}
              currentUserId={currentUser._id}
              onClick={() => setSelected(conv)}
            />
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col relative`}>
        {selected ? (
          <ChatWindow
            key={selected._id}
            conversation={selected}
            onBack={() => setSelected(null)}
            onConversationDeleted={handleConvDeleted}
            onCallUser={handleStartCall}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center"
            style={{ background: 'radial-gradient(ellipse at center, #0d1520 0%, #0b0f14 100%)' }}>
            <div className="text-center animate-fade-in">
              <div className="text-6xl mb-4">💬</div>
              <p className="font-bold text-white/30 text-lg">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
