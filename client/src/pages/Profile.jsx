import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { updateUser, uploadAvatar, uploadPhotos, deletePhoto, getUserPosts, removeFriend } from '../utils/api';
import { api } from '../utils/api';
import { deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import Avatar from '../components/Avatar';
import PostCard from '../components/feed/PostCard';

function DeleteAccountModal({ onConfirm, onCancel, loading }) {
  const [typed, setTyped] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="card w-full max-w-sm p-6 animate-slide-up" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Delete Account</h3>
        <p className="text-white/50 text-sm mb-5 leading-relaxed">
          This will permanently delete your account, posts, messages, and all data. This cannot be undone.
        </p>
        <p className="text-xs text-white/40 mb-2">Type <span className="font-bold text-red-400">DELETE</span> to confirm</p>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="DELETE"
          className="input mb-4"
          style={{ borderColor: typed === 'DELETE' ? 'rgba(239,68,68,0.5)' : undefined }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={typed !== 'DELETE' || loading}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
          >
            {loading ? 'Deleting…' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { currentUser, setCurrentUser, refreshCurrentUser, logout } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${currentUser._id}/account`);
      if (auth.currentUser) await deleteUser(auth.currentUser);
      logout();
    } catch (err) {
      console.error('Delete account error:', err);
    }
    setDeleting(false);
  };

  if (!currentUser) return null;

  const tabs = [
    { key: 'posts', label: 'Posts' },
    { key: 'photos', label: 'Photos' },
    { key: 'friends', label: 'Friends' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}

      {/* Profile Card */}
      <div className="card mb-5 overflow-hidden animate-slide-up-1"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

        {/* Banner */}
        <div className="h-28 relative"
          style={{ background: 'linear-gradient(135deg, #0D1526 0%, #1A3A6A 50%, #0D1526 100%)' }}>
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #3B82F6 0%, transparent 60%)' }} />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #60A5FA 0%, transparent 60%)' }} />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-5">
            {/* Avatar */}
            <div className="relative self-start">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-bg shadow-xl">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-2xl font-black">
                    {currentUser.displayName?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarRef.current.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-accent flex items-center justify-center shadow-lg hover:bg-accent-light transition-colors"
                style={{ boxShadow: '0 0 12px rgba(59,130,246,0.5)' }}
              >
                {uploadingAvatar ? (
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + actions */}
            {!editing && (
              <div className="flex-1 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">{currentUser.displayName}</h2>
                </div>
                <p className="text-accent text-sm font-medium">@{currentUser.username}</p>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Display Name</label>
                  <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="Your name" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email" type="email" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell something about yourself…" rows={3} className="input resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number" type="tel" className="input" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={loading} className="btn-primary">
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {currentUser.bio && (
                <p className="text-white/60 text-sm mb-4 leading-relaxed">{currentUser.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mb-5">
                <div>
                  <p className="text-xl font-bold text-white">{posts.length}</p>
                  <p className="text-xs text-muted font-medium">Posts</p>
                </div>
                <div className="w-px h-8 bg-brd" />
                <div>
                  <p className="text-xl font-bold text-accent">{currentUser.friends?.length || 0}</p>
                  <p className="text-xs text-muted font-medium">Friends</p>
                </div>
                {currentUser.email && (
                  <>
                    <div className="w-px h-8 bg-brd" />
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {currentUser.email}
                    </div>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditing(true)} className="btn-outline">
                  Edit Profile
                </button>
                <button onClick={logout} className="btn-secondary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="btn-danger flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Account
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 animate-slide-up-2 p-1 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2744' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              tab === t.key
                ? 'bg-accent text-white shadow-lg'
                : 'text-white/40 hover:text-white/70'
            }`}
            style={tab === t.key ? { boxShadow: '0 4px 12px rgba(59,130,246,0.35)' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {tab === 'posts' && (
        <div className="space-y-4 animate-fade-in">
          {posts.length === 0 ? (
            <div className="text-center py-20 card">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-white/40 mb-1">No posts yet</p>
              <p className="text-sm text-white/20">Share your first post from Home</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post._id} post={post} onUpdate={() => getUserPosts(currentUser._id).then(r => setPosts(r.data))} />
            ))
          )}
        </div>
      )}

      {/* Photos */}
      {tab === 'photos' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(currentUser.photos || []).map((photo, idx) => (
              <div key={idx} className="relative aspect-square group rounded-xl overflow-hidden" style={{ border: '1px solid #1A2744' }}>
                <img src={photo} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleDeletePhoto(idx)}
                    className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => photosRef.current.click()}
              disabled={uploadingPhotos}
              className="aspect-square rounded-xl border-2 border-dashed border-brd flex flex-col items-center justify-center text-muted hover:border-accent/40 hover:text-accent transition-all duration-200"
            >
              {uploadingPhotos ? (
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Friends */}
      {tab === 'friends' && (
        <div className="space-y-2 animate-fade-in">
          {(!currentUser.friends || currentUser.friends.length === 0) ? (
            <div className="text-center py-20 card">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-semibold text-white/40 mb-1">No friends yet</p>
              <p className="text-sm text-white/20">Find people in the Discover section</p>
            </div>
          ) : (
            currentUser.friends.map((friend, i) => (
              <div key={friend._id || friend}
                className="card p-4 flex items-center gap-3 hover:border-brd-light transition-all duration-200"
                style={{ animation: `slideUp 0.4s ease-out ${i * 0.04}s both` }}>
                <Avatar user={friend} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{friend.displayName || 'Friend'}</p>
                  <p className="text-xs text-muted">@{friend.username || ''}</p>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend._id || friend)}
                  className="text-xs text-red-400/50 hover:text-red-400 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-400/20"
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
