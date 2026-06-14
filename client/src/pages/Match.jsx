import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, getConversation } from '../utils/api';
import Avatar from '../components/Avatar';

function HeartBurst({ active }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {['❤️','💕','✨','💗','⭐'].map((e, i) => (
        <span key={i} className="absolute text-lg"
          style={{
            left: `${20 + i * 15}%`,
            bottom: '50%',
            animation: `floatHeart 1s ease-out ${i * 0.1}s both`,
          }}>
          {e}
        </span>
      ))}
    </div>
  );
}

export default function Match() {
  const { currentUser, refreshCurrentUser } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('discover');
  const [burstCard, setBurstCard] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ search, exclude: currentUser._id });
      setUsers(res.data.filter(u => u._id !== currentUser._id));
    } catch {}
    setLoading(false);
  }, [search, currentUser._id]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const isFriend = (userId) => currentUser.friends?.some(f => (f._id || f) === userId);
  const hasSentRequest = (userId) => currentUser.sentRequests?.some(r => (r._id || r) === userId);
  const hasReceivedRequest = (userId) => currentUser.friendRequests?.some(r => (r._id || r) === userId);

  const handleAddFriend = async (userId) => {
    setBurstCard(userId);
    setTimeout(() => setBurstCard(null), 1200);
    try {
      await sendFriendRequest(currentUser._id, userId);
      await refreshCurrentUser();
    } catch {}
  };

  const handleAccept = async (userId) => {
    setBurstCard(userId);
    setTimeout(() => setBurstCard(null), 1200);
    try {
      await acceptFriendRequest(currentUser._id, userId);
      await refreshCurrentUser();
    } catch {}
  };

  const handleDecline = async (userId) => {
    try {
      await declineFriendRequest(currentUser._id, userId);
      await refreshCurrentUser();
    } catch {}
  };

  const handleChat = async (userId) => {
    try {
      await getConversation(currentUser._id, userId);
      navigate('/chats');
    } catch {}
  };

  const friendIds = new Set((currentUser.friends || []).map(f => f._id || f));
  const requestIds = new Set((currentUser.friendRequests || []).map(r => r._id || r));

  const friendUsers = users.filter(u => friendIds.has(u._id));
  const requestUsers = users.filter(u => requestIds.has(u._id));
  const discoverUsers = users.filter(u => !friendIds.has(u._id) && !requestIds.has(u._id));

  const displayUsers = tab === 'friends' ? friendUsers : tab === 'requests' ? requestUsers : discoverUsers;

  const tabs = [
    { key: 'discover', label: 'Discover', emoji: '🌍' },
    { key: 'requests', label: `Requests${requestUsers.length > 0 ? ` (${requestUsers.length})` : ''}`, emoji: '💌' },
    { key: 'friends', label: 'Friends', emoji: '✨' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-6 animate-slide-up-1">
        <h1 className="text-2xl font-black text-white">
          Find <span className="text-accent">Friends</span>
        </h1>
        <p className="text-white/30 text-sm mt-1">Strangers are just friends you haven't met yet 💫</p>
      </div>

      {/* Search */}
      <div className="relative mb-5 animate-slide-up-2">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-brd rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 text-white placeholder-white/20 text-sm transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-slide-up-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
              tab === t.key
                ? 'bg-accent text-bg shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'bg-card border border-brd text-white/40 hover:text-white hover:border-accent/30'
            }`}
          >
            <span>{t.emoji}</span>
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Users */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 animate-pulse border-brd">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brd" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-brd rounded w-24" />
                  <div className="h-2 bg-brd/60 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayUsers.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-5xl mb-4">
            {tab === 'requests' ? '💌' : tab === 'friends' ? '👥' : '🌍'}
          </div>
          <p className="font-bold text-white/40">
            {tab === 'requests' ? 'No pending requests' : tab === 'friends' ? 'No friends yet' : 'No users found'}
          </p>
          {tab === 'discover' && (
            <p className="text-sm text-white/20 mt-1">Try a different search</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayUsers.map((user, i) => (
            <div key={user._id} className="card p-4 border-brd hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
              style={{
                animation: `slideUp 0.5s ease-out ${i * 0.07}s both`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}>

              <HeartBurst active={burstCard === user._id} />

              {/* Stranger to friend animation hint */}
              {tab === 'discover' && !isFriend(user._id) && !hasSentRequest(user._id) && (
                <div className="absolute top-3 right-3">
                  <span className="text-xs text-white/20 font-medium">Stranger</span>
                </div>
              )}
              {isFriend(user._id) && (
                <div className="absolute top-3 right-3">
                  <span className="text-xs text-accent font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" />
                    Friend
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => { const id = user.username || user._id; if (id) navigate(`/user/${id}`); }}>
                <div className="relative">
                  <Avatar user={user} size={14} />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${user.isOnline ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-white/10'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate hover:text-accent transition-colors">{user.displayName}</p>
                  <p className="text-xs text-white/30 truncate">@{user.username}</p>
                  {user.bio && <p className="text-xs text-white/20 truncate mt-0.5">{user.bio}</p>}
                </div>
              </div>

              <div className="flex gap-2">
                {isFriend(user._id) ? (
                  <button onClick={() => handleChat(user._id)} className="flex-1 btn-primary text-xs py-2">
                    💬 Message
                  </button>
                ) : hasReceivedRequest(user._id) ? (
                  <>
                    <button onClick={() => handleAccept(user._id)} className="flex-1 btn-primary text-xs py-2">✓ Accept</button>
                    <button onClick={() => handleDecline(user._id)} className="flex-1 btn-secondary text-xs py-2">✕</button>
                  </>
                ) : hasSentRequest(user._id) ? (
                  <button disabled className="flex-1 btn-secondary text-xs py-2 opacity-50">Requested ✓</button>
                ) : (
                  <button onClick={() => handleAddFriend(user._id)}
                    className="flex-1 btn-primary text-xs py-2 group relative overflow-hidden">
                    <span className="relative z-10">👋 Add Friend</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
