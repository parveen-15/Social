import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  getUserByIdentifier, getUserPosts,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  getConversation,
} from '../utils/api';
import Avatar from '../components/Avatar';
import PostCard from '../components/feed/PostCard';

export default function UserProfile() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const { currentUser, refreshCurrentUser } = useApp();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getUserByIdentifier(identifier)
      .then(async res => {
        setUser(res.data);
        const postsRes = await getUserPosts(res.data._id).catch(() => ({ data: [] }));
        setPosts(postsRes.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [identifier]);

  const isMe = user?._id === currentUser?._id;
  const isFriend = currentUser?.friends?.some(f => (f._id || f) === user?._id);
  const sentRequest = currentUser?.sentRequests?.some(r => (r._id || r) === user?._id);
  const receivedRequest = currentUser?.friendRequests?.some(r => (r._id || r) === user?._id);

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await sendFriendRequest(currentUser._id, user._id);
      await refreshCurrentUser();
    } catch {}
    setActionLoading(false);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await acceptFriendRequest(currentUser._id, user._id);
      await refreshCurrentUser();
    } catch {}
    setActionLoading(false);
  };

  const handleMessage = async () => {
    try {
      await getConversation(currentUser._id, user._id);
      navigate('/chats');
    } catch {}
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"
        style={{ boxShadow: '0 0 20px rgba(6,182,212,0.4)' }} />
    </div>
  );

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-6 text-center">
      <div className="text-6xl mb-4">👤</div>
      <h2 className="text-2xl font-black text-white mb-2">User not found</h2>
      <p className="text-white/40 text-sm mb-6">No account with username or ID "<span className="text-accent">{identifier}</span>"</p>
      <button onClick={() => navigate(-1)} className="btn-secondary px-6 py-2.5 text-sm">Go Back</button>
    </div>
  );

  const tabs = [
    { key: 'posts', label: 'Posts', emoji: '📸' },
    { key: 'photos', label: 'Photos', emoji: '🖼️' },
    { key: 'friends', label: 'Friends', emoji: '👥' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/40 hover:text-accent transition-colors mb-4 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Profile card */}
      <div className="card p-6 mb-6 border-brd animate-slide-up-1"
        style={{ boxShadow: '0 0 40px rgba(6,182,212,0.06), 0 10px 40px rgba(0,0,0,0.4)' }}>

        {/* Banner */}
        <div className="h-20 rounded-xl mb-4 -mx-2 -mt-2 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0B0F14, #06B6D4 50%, #0B0F14)', opacity: 0.6 }} />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative -mt-12 flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-accent/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {user.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent to-cyan-300 flex items-center justify-center text-bg text-3xl font-black">
                  {user.displayName?.[0]}
                </div>
              )}
            </div>
            {user.isOnline && (
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-card shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left mt-1">
            <h2 className="text-2xl font-black text-white">{user.displayName}</h2>
            <p className="text-accent text-sm font-medium mt-0.5">@{user.username}</p>
            {user.isOnline
              ? <p className="text-green-400 text-xs mt-0.5 font-medium">● Online</p>
              : <p className="text-white/30 text-xs mt-0.5">Last seen recently</p>}
            {user.bio && <p className="text-white/60 text-sm mt-2 leading-relaxed">{user.bio}</p>}

            {/* Stats */}
            <div className="flex gap-6 mt-4 justify-center sm:justify-start">
              <div className="text-center">
                <p className="font-black text-xl text-white">{posts.length}</p>
                <p className="text-xs text-white/30 font-medium">Posts</p>
              </div>
              <div className="w-px bg-brd" />
              <div className="text-center">
                <p className="font-black text-xl text-accent">{user.friends?.length || 0}</p>
                <p className="text-xs text-white/30 font-medium">Friends</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
              {isMe ? (
                <button onClick={() => navigate('/profile')} className="btn-outline text-sm px-6">
                  Edit Profile
                </button>
              ) : (
                <>
                  {isFriend ? (
                    <>
                      <button onClick={handleMessage} className="btn-primary text-sm px-5 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Message
                      </button>
                      <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-4 py-2 rounded-xl font-semibold">
                        ✓ Friends
                      </span>
                    </>
                  ) : receivedRequest ? (
                    <>
                      <button onClick={handleAccept} disabled={actionLoading} className="btn-primary text-sm px-5">
                        {actionLoading ? '...' : 'Accept Request'}
                      </button>
                      <button onClick={() => declineFriendRequest(currentUser._id, user._id).then(refreshCurrentUser)} className="btn-secondary text-sm px-4">
                        Decline
                      </button>
                    </>
                  ) : sentRequest ? (
                    <span className="text-sm text-white/40 border border-brd px-5 py-2 rounded-xl font-medium">
                      Request Sent
                    </span>
                  ) : (
                    <button onClick={handleAddFriend} disabled={actionLoading} className="btn-primary text-sm px-5 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      {actionLoading ? 'Sending...' : 'Add Friend'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-slide-up-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
              tab === t.key
                ? 'bg-accent text-bg shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'bg-card border border-brd text-white/40 hover:text-white hover:border-accent/30'
            }`}>
            <span>{t.emoji}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Posts */}
      {tab === 'posts' && (
        <div className="space-y-4 animate-fade-in">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📸</div>
              <p className="font-bold text-white/30">No posts yet</p>
            </div>
          ) : posts.map((post, i) => (
            <div key={post._id} style={{ animation: `slideUp 0.4s ease-out ${i * 0.05}s both` }}>
              <PostCard post={post} onUpdate={() => getUserPosts(user._id).then(r => setPosts(r.data))} />
            </div>
          ))}
        </div>
      )}

      {/* Photos */}
      {tab === 'photos' && (
        <div className="animate-fade-in">
          {(!user.photos || user.photos.length === 0) ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🖼️</div>
              <p className="font-bold text-white/30">No photos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {user.photos.map((photo, idx) => (
                <div key={idx} className="aspect-square">
                  <img src={photo} className="w-full h-full object-cover rounded-xl ring-1 ring-brd" alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friends */}
      {tab === 'friends' && (
        <div className="space-y-3 animate-fade-in">
          {(!user.friends || user.friends.length === 0) ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">👥</div>
              <p className="font-bold text-white/30">No friends yet</p>
            </div>
          ) : user.friends.map((friend, i) => (
            <div key={friend._id || friend}
              className="card p-4 flex items-center gap-3 border-brd hover:border-accent/20 transition-all cursor-pointer"
              style={{ animation: `slideUp 0.4s ease-out ${i * 0.05}s both` }}
              onClick={() => navigate(`/user/${friend.username || friend._id}`)}>
              <Avatar user={friend} size={12} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{friend.displayName || 'User'}</p>
                <p className="text-xs text-white/30">@{friend.username || ''}</p>
              </div>
              <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Search bar at bottom */}
      <div className="mt-8 animate-slide-up-3">
        <SearchUser />
      </div>
    </div>
  );
}

function SearchUser() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/user/${query.trim()}`);
  };
  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, username, or ID..."
        className="input flex-1 text-sm"
      />
      <button type="submit" className="btn-primary text-sm px-4">Visit</button>
    </form>
  );
}
