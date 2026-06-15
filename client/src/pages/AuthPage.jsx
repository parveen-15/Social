import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const easeOut = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

function InputField({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      />
    </div>
  );
}

function Divider({ label = 'or continue with' }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-xs text-white/25 font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

function SocialBtn({ icon, label, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold text-white/80 hover:text-white transition-all disabled:opacity-40"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

/* ── Icons ────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

/* ═══ Main component ════════════════════════════════ */
export default function AuthPage() {
  const navigate = useNavigate();
  const { syncError, setSyncError, syncing } = useApp();
  const [tab, setTab]               = useState('login');   // 'login' | 'signup'
  const [method, setMethod]         = useState('email');   // 'email' | 'phone'
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const recaptchaRef = useRef(null);

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch {}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setErr = (msg) => { setError(msg); setLoading(false); };

  /* ── Social providers ── */
  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setErr(e.code === 'auth/popup-closed-by-user' ? '' : e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Email/Password ── */
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return setErr('Please fill in all fields');
    if (tab === 'signup' && password.length < 6) return setErr('Password must be at least 6 characters');
    setLoading(true); setError('');
    try {
      if (tab === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      const msg = {
        'auth/email-already-in-use': 'This email is already registered. Try logging in.',
        'auth/invalid-email':        'Please enter a valid email address.',
        'auth/user-not-found':       'No account found with this email.',
        'auth/wrong-password':       'Incorrect password.',
        'auth/too-many-requests':    'Too many attempts. Please try again later.',
      }[e.code] || e.message;
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Phone/OTP ── */
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
        callback: () => {},
      });
    }
    return window.recaptchaVerifier;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return setErr('Enter your phone number');
    setLoading(true); setError('');
    try {
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone.trim(), verifier);
      setConfirmResult(result);
      setOtpSent(true);
      setLoading(false);
    } catch (e) {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch {}
        window.recaptchaVerifier = null;
      }
      setErr(e.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return setErr('Enter the OTP code');
    setLoading(true); setError('');
    try {
      await confirmResult.confirm(otp.trim());
    } catch {
      setErr('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = error.replace(/^Firebase: /, '').replace(/ \(auth\/[^)]+\)\.?$/, '');

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />

      {/* invisible reCAPTCHA anchor */}
      <div ref={recaptchaRef} />

      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8 select-none">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
            <img src="/logo.png" alt="logo" className="w-5 h-5 object-contain"
              onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='block'; }} />
            <svg style={{display:'none'}} className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-black text-xl tracking-tight">
            <span className="text-white">Social</span><span className="text-accent">App</span>
          </span>
        </Link>

        {/* Syncing overlay — shown while AppContext contacts the server after Firebase login */}
        {syncing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(11,15,20,0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ boxShadow: '0 0 20px rgba(59,130,246,0.5)' }} />
              <p className="text-white/80 text-sm font-semibold">Signing you in…</p>
              <p className="text-white/30 text-xs mt-1">Server is waking up, please wait up to 30s</p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'linear-gradient(145deg, #0D1526, #080C14)', border: '1px solid #1A2744', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>

          {/* Login / Signup tab */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setMethod('email'); setOtpSent(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-300 ${
                  tab === t ? 'text-bg' : 'text-white/35 hover:text-white/60'
                }`}
                style={tab === t ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 16px rgba(59,130,246,0.4)' } : {}}>
                {t === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Server sync error (shown after Google/phone auth if server is down) */}
          {syncError && (
            <div className="mb-4 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{syncError}</span>
              <button onClick={() => setSyncError('')} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
            </div>
          )}

          {/* Social buttons */}
          <div className="mb-1">
            <SocialBtn icon={<GoogleIcon />} label="Continue with Google" onClick={handleGoogle} disabled={loading} />
          </div>

          <Divider />

          {/* Method picker */}
          <div className="flex rounded-lg p-0.5 mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {[{ k: 'email', l: '✉ Email' }, { k: 'phone', l: '📱 Phone' }].map(({ k, l }) => (
              <button key={k} onClick={() => { setMethod(k); setError(''); setOtpSent(false); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  method === k ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                }`}>
                {l}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── EMAIL METHOD ── */}
            {method === 'email' && (
              <motion.form key="email" onSubmit={handleEmailSubmit}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }} className="space-y-4"
              >
                {tab === 'signup' && (
                  <InputField label="Full Name" value={name} onChange={setName}
                    placeholder="Alex Johnson" autoComplete="name" />
                )}
                <InputField label="Email" type="email" value={email} onChange={setEmail}
                  placeholder="you@example.com" autoComplete="email" />
                <InputField label="Password" type="password" value={password} onChange={setPassword}
                  placeholder="••••••••" autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} />

                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {friendlyError}
                  </p>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(59,130,246,0.55)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-bg disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {tab === 'signup' ? 'Creating account…' : 'Signing in…'}
                    </span>
                  ) : (
                    tab === 'signup' ? 'Create Account' : 'Sign In'
                  )}
                </motion.button>
              </motion.form>
            )}

            {/* ── PHONE METHOD ── */}
            {method === 'phone' && !otpSent && (
              <motion.form key="phone" onSubmit={handleSendOtp}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }} className="space-y-4"
              >
                <InputField label="Phone Number" type="tel" value={phone} onChange={setPhone}
                  placeholder="+1 234 567 8900" autoComplete="tel" />
                <p className="text-white/25 text-xs">Include country code (e.g. +1 for US, +91 for India)</p>

                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {friendlyError}
                  </p>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-bg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </motion.button>
              </motion.form>
            )}

            {method === 'phone' && otpSent && (
              <motion.form key="otp" onSubmit={handleVerifyOtp}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }} className="space-y-4"
              >
                <p className="text-white/50 text-sm text-center">
                  Code sent to <span className="text-accent font-semibold">{phone}</span>
                </p>
                <InputField label="OTP Code" value={otp} onChange={setOtp}
                  placeholder="123456" autoComplete="one-time-code" />

                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {friendlyError}
                  </p>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-bg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </motion.button>

                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                  className="w-full text-center text-xs text-white/35 hover:text-accent transition-colors mt-1">
                  ← Change number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer link */}
          <p className="text-center text-white/25 text-xs mt-6">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-accent hover:text-accent-light transition-colors font-semibold">
              {tab === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>
        </div>

        {/* Back to landing */}
        <p className="text-center text-white/20 text-xs mt-5">
          <Link to="/" className="hover:text-white/50 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
