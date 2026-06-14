import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { updateUser, uploadAvatar, uploadPhotos, deletePhoto, getUserPosts, removeFriend } from '../utils/api';
import Avatar from '../components/Avatar';
import PostCard from '../components/feed/PostCard';

export default function Profile() {
  const { currentUser, setCurrentUser, refreshCurrentUser, logout } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const avatarRef = useRef();
  const photosRef = useRef();

  useEffect(() => {
    if (currentUser) {
      setForm({
        displayName: currentUser.displayName || '',
        bio: currentUser.bio || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      });
      getUserPosts(currentUser._id).then(res => setPosts(res.data)).catch(() => {});
    }
  }, [currentUser]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateUser(currentUser._id, form);
      setCurrentUser(res.data);
      setEditing(false);
    } catch {}
    setLoading(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(currentUser._id, file);
      setCurrentUser(prev => ({ ...prev, avatar: res.data.avatar }));
    } catch {}
    setUploadingAvatar(false);
  };

  const handlePhotosChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const res = await uploadPhotos(currentUser._id, files);
      setCurrentUser(prev => ({ ...prev, photos: res.data.photos }));
    } catch {}
    setUploadingPhotos(false);
  };

  const handleDeletePhoto = async (idx) => {
    try {
      const res = await deletePhoto(currentUser._id, idx);
      setCurrentUser(prev => ({ ...prev, photos: res.data.photos }));
    } catch {}
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await removeFriend(currentUser._id, friendId);
      await refreshCurrentUser();
    } catch {}
  };

  if (!currentUser) return null;

  const tabs = [
    { key: 'posts', label: 'Posts', emoji: '📸' },
    { key: 'photos', label: 'Photos', emoji: '🖼️' },
    { key: 'friends', label: 'Friends', emoji: '👥' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Profile Header */}
      <div className="card p-6 mb-6 border-brd animate-slide-up-1"
        style={{ boxShadow: '0 0 40px rgba(6,182,212,0.06), 0 10px 40px rgba(0,0,0,0.4)' }}>

        {/* Banner */}
        <div className="h-24 rounded-xl mb-4 -mx-2 -mt-2 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0B0F14, #06B6D4 50%, #0B0F14)', opacity: 0.6 }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-accent/20 text-6xl font-black tracking-widest">SOCIAL</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0 -mt-12">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-accent/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {currentUser.avatar ? (
                <img src={`${currentUser.avatar}`} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent to-cyan-300 flex items-center justify-center text-bg text-3xl font-black">
                  {currentUser.displayName?.[0]}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarRef.current.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent text-bg flex items-center justify-center shadow-lg hover:bg-accent-light transition-colors"
            >
              {uploadingAvatar ? (
                <div className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
            {editing ? (
              <div className="space-y-3">
                <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Display Name" className="input" />
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Bio" rows={2} className="input resize-none" />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email" type="email" className="input" />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number" type="tel" className="input" />
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={loading} className="btn-primary text-sm px-6">
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-6">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black text-white">{currentUser.displayName}</h2>
                <p className="text-accent text-sm mt-0.5 font-medium">@{currentUser.username}</p>
                {currentUser.bio && <p className="text-white/60 text-sm mt-2 leading-relaxed">{currentUser.bio}</p>}

                <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                  {currentUser.email && (
                    <span className="flex items-center gap-1.5 text-xs text-white/30 bg-bg px-3 py-1.5 rounded-full border border-brd">
                      <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {currentUser.email}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-4 justify-center sm:justify-start">
                  <div className="text-center">
                    <p className="font-black text-xl text-white">{posts.length}</p>
                    <p className="text-xs text-white/30 font-medium">Posts</p>
                  </div>
                  <div className="w-px bg-brd" />
                  <div className="text-center">
                    <p className="font-black text-xl text-accent">{currentUser.friends?.length || 0}</p>
                    <p className="text-xs text-white/30 font-medium">Friends</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setEditing(true)} className="btn-outline text-sm px-6">
                    Edit Profile
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 text-sm px-6 py-2 rounded-xl font-semibold transition-all duration-200"
                    style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-slide-up-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
              tab === t.key
                ? 'bg-accent text-bg shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'bg-card border border-brd text-white/40 hover:text-white hover:border-accent/30'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {tab === 'posts' && (
        <div className="space-y-4 animate-fade-in">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📸</div>
              <p className="font-bold text-white/30">No posts yet</p>
              <p className="text-sm text-white/20">Share your first post from Home</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post._id} post={post} onUpdate={() => getUserPosts(currentUser._id).then(r => setPosts(r.data))} />
            ))
          )}
        </div>
      )}

      {/* Photos Tab */}
      {tab === 'photos' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(currentUser.photos || []).map((photo, idx) => (
              <div key={idx} className="relative aspect-square group">
                <img src={`${photo}`} className="w-full h-full object-cover rounded-xl ring-1 ring-brd group-hover:ring-accent/40 transition-all" alt="" />
                <div className="absolute inset-0 bg-bg/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDeletePhoto(idx)}
                    className="w-8 h-8 rounded-full bg-red-500 text-white text-lg flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => photosRef.current.click()}
              disabled={uploadingPhotos}
              className="aspect-square rounded-xl border-2 border-dashed border-brd flex flex-col items-center justify-center text-white/20 hover:border-accent/50 hover:text-accent transition-all duration-300"
            >
              {uploadingPhotos ? (
                <div className="w-6 h-6 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs font-medium">Add</span>
                </>
              )}
            </button>
          </div>
          <input ref={photosRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePhotosChange} />
        </div>
      )}

      {/* Friends Tab */}
      {tab === 'friends' && (
        <div className="space-y-3 animate-fade-in">
          {(!currentUser.friends || currentUser.friends.length === 0) ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">👥</div>
              <p className="font-bold text-white/30">No friends yet</p>
              <p className="text-sm text-white/20">Find friends in the Match section</p>
            </div>
          ) : (
            currentUser.friends.map((friend, i) => (
              <div key={friend._id || friend}
                className="card p-4 flex items-center gap-3 border-brd hover:border-accent/20 transition-all duration-200"
                style={{ animation: `slideUp 0.4s ease-out ${i * 0.05}s both` }}>
                <Avatar user={friend} size={12} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{friend.displayName || 'Friend'}</p>
                  <p className="text-xs text-white/30">@{friend.username || ''}</p>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend._id || friend)}
                  className="text-xs text-red-400/60 hover:text-red-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
