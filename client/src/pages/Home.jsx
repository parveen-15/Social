import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPosts, getUsers, sendFriendRequest, getConversation } from '../utils/api';
import { useApp } from '../context/AppContext';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';
import Avatar from '../components/Avatar';

/* ═══════════════════════════════════════════════════════════════
   TINDER DISCOVER
═══════════════════════════════════════════════════════════════ */
const SWIPE_THRESHOLD = 90;

function SwipeCard({ user, onLike, onPass, style, isTop, navigate }) {
  const dragRef = useRef({ x: 0, y: 0, dragging: false, startX: 0, startY: 0 });
  const cardRef = useRef();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [flying, setFlying] = useState(null); // 'left' | 'right'
  const animFrame = useRef();

  const applyTransform = (x, y) => {
    if (!cardRef.current) return;
    const rot = x * 0.06;
    cardRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    // Update overlay labels
    const likeEl = cardRef.current.querySelector('[data-label="like"]');
    const passEl = cardRef.current.querySelector('[data-label="pass"]');
    if (likeEl) likeEl.style.opacity = Math.min(1, x / 60);
    if (passEl) passEl.style.opacity = Math.min(1, -x / 60);
  };

  const onPointerDown = (e) => {
    if (!isTop) return;
    dragRef.current = { x: 0, y: 0, dragging: true, startX: e.clientX, startY: e.clientY };
    cardRef.current.style.transition = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const x = e.clientX - dragRef.current.startX;
    const y = e.clientY - dragRef.current.startY;
    dragRef.current.x = x;
    dragRef.current.y = y;
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(() => applyTransform(x, y));
  };

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const x = dragRef.current.x;

    if (x > SWIPE_THRESHOLD) {
      cardRef.current.style.transition = 'transform 0.35s ease-out, opacity 0.35s';
      cardRef.current.style.transform = `translate(120vw, ${dragRef.current.y}px) rotate(30deg)`;
      cardRef.current.style.opacity = '0';
      setTimeout(onLike, 320);
    } else if (x < -SWIPE_THRESHOLD) {
      cardRef.current.style.transition = 'transform 0.35s ease-out, opacity 0.35s';
      cardRef.current.style.transform = `translate(-120vw, ${dragRef.current.y}px) rotate(-30deg)`;
      cardRef.current.style.opacity = '0';
      setTimeout(onPass, 320);
    } else {
      cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cardRef.current.style.transform = 'translate(0,0) rotate(0deg)';
      const likeEl = cardRef.current.querySelector('[data-label="like"]');
      const passEl = cardRef.current.querySelector('[data-label="pass"]');
      if (likeEl) likeEl.style.opacity = 0;
      if (passEl) passEl.style.opacity = 0;
    }
  };

  const triggerLike = () => {
    if (!cardRef.current || !isTop) return;
    cardRef.current.style.transition = 'transform 0.35s ease-out, opacity 0.35s';
    cardRef.current.style.transform = 'translate(120vw, 0) rotate(30deg)';
    cardRef.current.style.opacity = '0';
    setTimeout(onLike, 320);
  };

  const triggerPass = () => {
    if (!cardRef.current || !isTop) return;
    cardRef.current.style.transition = 'transform 0.35s ease-out, opacity 0.35s';
    cardRef.current.style.transform = 'translate(-120vw, 0) rotate(-30deg)';
    cardRef.current.style.opacity = '0';
    setTimeout(onPass, 320);
  };

  const photo = user.photos?.[0] || user.avatar || null;

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      className="absolute inset-0 rounded-3xl overflow-hidden select-none"
      style={{ ...style, cursor: isTop ? 'grab' : 'default', touchAction: 'none' }}>

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a2035] to-[#0d1520]">
        {photo ? (
          <img src={photo} className="w-full h-full object-cover opacity-80" alt="" draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-[8rem] leading-none">
              {user.displayName?.[0]}
            </div>
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />

      {/* LIKE / PASS overlays */}
      <div data-label="like"
        className="absolute top-8 left-6 border-4 border-green-400 text-green-400 font-black text-2xl px-4 py-1 rounded-xl rotate-[-20deg] tracking-wider pointer-events-none"
        style={{ opacity: 0, transition: 'opacity 0.1s' }}>
        LIKE ♥
      </div>
      <div data-label="pass"
        className="absolute top-8 right-6 border-4 border-red-400 text-red-400 font-black text-2xl px-4 py-1 rounded-xl rotate-[20deg] tracking-wider pointer-events-none"
        style={{ opacity: 0, transition: 'opacity 0.1s' }}>
        NOPE ✕
      </div>

      {/* Online badge */}
      {user.isOnline && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500/20 border border-green-400/40 px-3 py-1 rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-semibold">Online</span>
        </div>
      )}

      {/* User info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
        <h2 className="text-2xl font-black text-white">{user.displayName}</h2>
        <p className="text-white/50 text-sm mt-0.5">@{user.username}</p>
        {user.bio && <p className="text-white/70 text-sm mt-2 leading-relaxed line-clamp-2">{user.bio}</p>}
        <div className="flex gap-3 mt-3 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/user/${user.username || user._id}`); }}
            className="text-xs text-accent border border-accent/30 px-3 py-1 rounded-full hover:bg-accent/10 transition-colors">
            View Profile
          </button>
        </div>
      </div>

      {/* Action buttons — only on top card */}
      {isTop && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 pb-6 pt-20"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
          <button onClick={triggerPass}
            className="w-14 h-14 rounded-full bg-[#1e2535] border border-red-400/30 text-red-400 text-2xl flex items-center justify-center shadow-xl hover:bg-red-500/20 hover:scale-110 transition-all duration-200">
            ✕
          </button>
          <button onClick={triggerLike}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white text-3xl flex items-center justify-center shadow-xl shadow-green-500/30 hover:scale-110 transition-all duration-200">
            ♥
          </button>
        </div>
      )}
    </div>
  );
}

function DiscoverTab() {
  const { currentUser, refreshCurrentUser } = useApp();
  const navigate = useNavigate();
  const [stack, setStack] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [matchUser, setMatchUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allSeen, setAllSeen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ exclude: currentUser._id });
      const friendSet = new Set((currentUser.friends || []).map(f => f._id || f));
      const sentSet = new Set((currentUser.sentRequests || []).map(r => r._id || r));
      const filtered = res.data.filter(u => u._id !== currentUser._id && !friendSet.has(u._id) && !sentSet.has(u._id));
      setStack(filtered.reverse()); // reverse so top of array = top card
    } catch {}
    setLoading(false);
  }, [currentUser._id, currentUser.friends, currentUser.sentRequests]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleLike = async (user) => {
    try {
      await sendFriendRequest(currentUser._id, user._id);
      setLikedIds(s => new Set([...s, user._id]));
      refreshCurrentUser();
    } catch {}
    setStack(prev => prev.slice(0, -1));
    if (stack.length <= 1) setAllSeen(true);
  };

  const handlePass = (user) => {
    setStack(prev => prev.slice(0, -1));
    if (stack.length <= 1) setAllSeen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (allSeen || stack.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center animate-fade-in">
      <div className="text-6xl mb-5">🎉</div>
      <h2 className="text-2xl font-black text-white mb-2">You've seen everyone!</h2>
      <p className="text-white/40 text-sm mb-6">Check back later for new people</p>
      <button onClick={() => { setAllSeen(false); loadUsers(); }} className="btn-primary px-6">Refresh</button>
    </div>
  );

  return (
    <div className="relative" style={{ height: '75vh', maxWidth: 420, margin: '0 auto' }}>
      {/* Card stack — render bottom to top */}
      {stack.slice(-3).map((user, i, arr) => {
        const isTop = i === arr.length - 1;
        const depth = arr.length - 1 - i;
        const scale = 1 - depth * 0.04;
        const translateY = depth * 12;
        return (
          <SwipeCard
            key={user._id}
            user={user}
            isTop={isTop}
            navigate={navigate}
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              transition: isTop ? 'none' : 'transform 0.3s ease',
              zIndex: 10 + i,
              transformOrigin: 'bottom center',
            }}
            onLike={() => handleLike(user)}
            onPass={() => handlePass(user)}
          />
        );
      })}

      {/* Liked users row at bottom */}
      {likedIds.size > 0 && (
        <div className="absolute -bottom-14 left-0 right-0 flex items-center gap-2 justify-center">
          <span className="text-white/30 text-xs">Liked:</span>
          {[...likedIds].slice(-5).map(id => {
            const u = stack.find(s => s._id === id) || { _id: id };
            return (
              <div key={id} className="w-8 h-8 rounded-full bg-accent/20 border-2 border-green-400/50 flex items-center justify-center text-sm font-bold text-white">
                ♥
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEED TAB
═══════════════════════════════════════════════════════════════ */
function FeedTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (p = 1, replace = false) => {
    setLoading(true);
    try {
      const res = await getPosts({ page: p, limit: 10 });
      setPosts(prev => replace ? res.data : [...prev, ...res.data]);
      setHasMore(res.data.length === 10);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(1, true); }, [fetchPosts]);

  return (
    <div className="space-y-4">
      <CreatePost onPostCreated={() => { setPage(1); fetchPosts(1, true); }} />

      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse border-brd">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brd" />
                <div className="flex-1 space-y-2"><div className="h-3 bg-brd rounded w-32" /><div className="h-2 bg-brd/60 rounded w-20" /></div>
              </div>
              <div className="h-48 bg-brd/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {posts.map((post, i) => (
            <div key={post._id} style={{ animation: `slideUp 0.4s ease-out ${i * 0.04}s both` }}>
              <PostCard post={post} onUpdate={() => fetchPosts(1, true)} />
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-20 animate-fade-in">
              <div className="text-6xl mb-4">🌟</div>
              <p className="font-bold text-white/60 text-lg">No posts yet</p>
              <p className="text-sm text-white/30 mt-1">Be the first to share something!</p>
            </div>
          )}
          {hasMore && posts.length > 0 && (
            <button onClick={() => { const next = page + 1; setPage(next); fetchPosts(next); }} disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white/30 hover:text-accent border border-brd hover:border-accent/30 rounded-xl transition-all">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />Loading...</span> : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME ROOT
═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const { currentUser } = useApp();
  const [tab, setTab] = useState('discover');

  return (
    <div className="max-w-xl mx-auto px-4 py-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-slide-up-1">
        <div>
          <h1 className="text-xl font-black text-white">
            Hey, <span className="text-accent">{currentUser?.displayName?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-white/30 text-xs">{tab === 'discover' ? 'Swipe to find new friends' : "What's happening today?"}</p>
        </div>
        <Avatar user={currentUser} size={10} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5 p-1 bg-card border border-brd rounded-2xl animate-slide-up-2">
        <button onClick={() => setTab('discover')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            tab === 'discover' ? 'bg-accent text-bg shadow-[0_0_16px_rgba(6,182,212,0.4)]' : 'text-white/40 hover:text-white'
          }`}>
          <svg className="w-4 h-4" fill={tab === 'discover' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Discover
        </button>
        <button onClick={() => setTab('feed')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            tab === 'feed' ? 'bg-accent text-bg shadow-[0_0_16px_rgba(6,182,212,0.4)]' : 'text-white/40 hover:text-white'
          }`}>
          <svg className="w-4 h-4" fill={tab === 'feed' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          Feed
        </button>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={tab}>
        {tab === 'discover' ? <DiscoverTab /> : <FeedTab />}
      </div>
    </div>
  );
}
