import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { completeProfile, uploadAvatar } from '../utils/api';

const easeOut = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

const INTERESTS = [
  '🎵 Music', '🎮 Gaming', '📸 Photography', '✈️ Travel', '🏋️ Fitness',
  '📚 Books', '🍕 Food', '🎨 Art', '💻 Tech', '🌿 Nature', '🎬 Movies', '⚽ Sports',
];

export default function Onboarding() {
  const { currentUser, setCurrentUser, refreshCurrentUser } = useApp();
  const [step, setStep]           = useState(1);
  const [username, setUsername]   = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio]             = useState('');
  const [interests, setInterests] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || '');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const toggleInterest = (i) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleFinish = async () => {
    if (!username.trim()) return setError('Username is required');
    if (username.length < 3) return setError('Username must be at least 3 characters');
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) return setError('Username can only contain letters, numbers, . and _');
    if (!displayName.trim()) return setError('Display name is required');

    setLoading(true); setError('');
    try {
      // Upload avatar first if chosen
      if (avatarFile && currentUser?._id) {
        await uploadAvatar(currentUser._id, avatarFile);
      }

      // Complete profile
      const res = await completeProfile({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: [bio.trim(), interests.join(', ')].filter(Boolean).join(' · '),
      });
      setCurrentUser(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const initials = displayName?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
            <svg className="w-5 h-5 text-bg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Set up your profile</h1>
          <p className="text-white/35 text-sm">You are almost in. Just a few details.</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-400 ${
              step >= s ? 'bg-accent w-6' : 'bg-white/10 w-6'
            }`} style={step >= s ? { boxShadow: '0 0 8px rgba(6,182,212,0.6)' } : {}} />
          ))}
        </div>

        <div className="rounded-2xl p-8 border border-white/8"
          style={{ background: 'linear-gradient(145deg, rgba(17,24,39,0.9), rgba(11,15,20,0.95))', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>

          {/* ── STEP 1: Identity ── */}
          {step === 1 && (
            <motion.div key="step1"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <label className="cursor-pointer group relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent/30 group-hover:border-accent/60 transition-colors"
                    style={{ boxShadow: '0 0 20px rgba(6,182,212,0.15)' }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-2xl text-white"
                        style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-bg"
                    style={{ background: '#06B6D4' }}>
                    <svg className="w-3.5 h-3.5 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <p className="text-white/25 text-xs">Tap to add a photo</p>
              </div>

              {/* Display name */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="How you want to appear"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  Username <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
                  <input value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())}
                    placeholder="your_username"
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
                <p className="text-white/20 text-xs mt-1">Letters, numbers, periods, underscores</p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  Bio <span className="text-white/20 normal-case font-normal">— optional</span>
                </label>
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="Tell people a bit about you…" rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <motion.button onClick={() => { setError(''); if (!username.trim()) return setError('Username is required'); if (username.length < 3) return setError('Username must be at least 3 characters'); if (!displayName.trim()) return setError('Display name is required'); setStep(2); }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-bg"
                style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}>
                Next →
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 2: Interests ── */}
          {step === 2 && (
            <motion.div key="step2"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div>
                <h3 className="font-black text-white text-lg mb-1">Pick your interests</h3>
                <p className="text-white/35 text-sm">We'll use these to suggest people you'll click with.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <button key={i} type="button"
                    onClick={() => toggleInterest(i)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                      interests.includes(i)
                        ? 'text-bg'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                    style={interests.includes(i)
                      ? { background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 12px rgba(6,182,212,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }
                    }>
                    {i}
                  </button>
                ))}
              </div>

              <p className="text-white/20 text-xs">{interests.length} selected (you can skip)</p>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-white/50 border border-white/8 hover:border-white/20 transition-colors">
                  ← Back
                </button>
                <motion.button onClick={handleFinish} disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-2 flex-1 py-3 rounded-xl font-bold text-sm text-bg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}>
                  {loading ? 'Setting up…' : 'Enter SocialApp 🚀'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
