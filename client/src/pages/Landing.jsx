import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
  AnimatePresence,
} from 'framer-motion';

/* ── Easing helpers ─────────────────────────────── */
const easeOut = { duration: 0.72, ease: [0.22, 1, 0.36, 1] };
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: easeOut },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 26 },
  show:   { opacity: 1, y: 0, transition: { ...easeOut, delay } },
});

/* ── Mock profile data ──────────────────────────── */
const CARDS = [
  {
    name: 'Aria Chen',    handle: '@aria.chen',  avatar: 'A',
    from: '#7C3AED', to: '#4F46E5',
    tags: ['Design', 'Music', 'Travel'], loc: 'San Francisco',
    x: 62, y: 10, rot: 7,  depth: 1.4,
  },
  {
    name: 'Marcus Osei',  handle: '@m.osei',     avatar: 'M',
    from: '#0891B2', to: '#0E7490',
    tags: ['Dev', 'Gaming', 'Coffee'],  loc: 'Berlin',
    x: 70, y: 50, rot: -5, depth: 1.0,
  },
  {
    name: 'Sofia Reyes',  handle: '@sofiareyes', avatar: 'S',
    from: '#DB2777', to: '#9D174D',
    tags: ['Fitness', 'Yoga', 'Art'],   loc: 'Barcelona',
    x: 57, y: 70, rot: 6,  depth: 0.7,
  },
  {
    name: 'Liam Park',    handle: '@liampark',   avatar: 'L',
    from: '#D97706', to: '#B45309',
    tags: ['Photo', 'Food', 'Jazz'],    loc: 'Seoul',
    x: 3,  y: 52, rot: -7, depth: 1.2,
  },
];

/* ── Particle config ────────────────────────────── */
const PARTICLES = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x:   Math.random() * 100,
  y:   Math.random() * 100,
  size: 1 + Math.random() * 2.5,
  delay: Math.random() * 6,
  dur:  4 + Math.random() * 8,
  opacity: 0.08 + Math.random() * 0.3,
}));

/* ── Profile card ───────────────────────────────── */
function ProfileCard({ card, mouseX, mouseY }) {
  const xT = useTransform(mouseX, v => v * card.depth * 0.018);
  const yT = useTransform(mouseY, v => v * card.depth * 0.018);
  const px = useSpring(xT, { stiffness: 40, damping: 18 });
  const py = useSpring(yT, { stiffness: 40, damping: 18 });

  return (
    <motion.div
      className="absolute select-none pointer-events-none"
      style={{
        left: `${card.x}%`, top: `${card.y}%`,
        x: px, y: py,
        rotate: card.rot,
        zIndex: Math.round(card.depth * 10),
      }}
      initial={{ opacity: 0, scale: 0.8, y: 40 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: card.depth * 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5 + card.depth, ease: 'easeInOut', repeat: Infinity, delay: card.depth * 0.5 }}
      >
        <div
          className="rounded-2xl border border-white/10 backdrop-blur-md p-4 w-52"
          style={{
            background: 'linear-gradient(135deg, rgba(17,24,39,0.88), rgba(11,15,20,0.92))',
            boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.65), 0 0 40px ${card.from}1a`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${card.from}, ${card.to})`,
                boxShadow: `0 0 18px ${card.from}55`,
              }}>
              {card.avatar}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight truncate">{card.name}</p>
              <p className="text-white/35 text-xs">{card.handle}</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
              style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />
          </div>
          <div className="flex items-center gap-1.5 mb-3 text-white/30 text-xs">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {card.loc}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: `${card.from}1a`, color: card.from, border: `1px solid ${card.from}40` }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Section header ─────────────────────────────── */
function SectionHeader({ badge, title, highlight, sub }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} className="text-center mb-14 md:mb-20"
      initial="hidden" animate={inView ? 'show' : 'hidden'} variants={fadeUp}>
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-accent border border-accent/25 bg-accent/5 mb-5">
        {badge}
      </span>
      <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
        {title}{' '}
        <span className="text-accent" style={{ textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>
          {highlight}
        </span>
      </h2>
      {sub && <p className="text-white/40 mt-4 max-w-xl mx-auto text-base md:text-lg leading-relaxed">{sub}</p>}
    </motion.div>
  );
}

/* ── Feature card ───────────────────────────────── */
function FeatureCard({ icon, title, desc, color, delay }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial="hidden" animate={inView ? 'show' : 'hidden'} variants={stagger(delay)}
      className="group relative rounded-2xl p-6 border border-white/5 overflow-hidden transition-colors duration-500 hover:border-white/10"
      style={{ background: 'linear-gradient(135deg, rgba(17,24,39,0.8), rgba(11,15,20,0.95))' }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}10 0%, transparent 65%)` }} />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-2xl"
          style={{ background: `${color}18`, border: `1px solid ${color}30`, boxShadow: `0 0 20px ${color}10` }}>
          {icon}
        </div>
        <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Step card ──────────────────────────────────── */
function StepCard({ step, icon, title, desc, color, isLast, delay }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref}
      initial="hidden" animate={inView ? 'show' : 'hidden'} variants={stagger(delay)}
      className="relative text-center"
    >
      {!isLast && (
        <div className="hidden md:block absolute top-10 left-[58%] right-[-38%] h-px opacity-30"
          style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      )}
      <div className="relative inline-flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-5 relative"
          style={{
            background: `linear-gradient(135deg, ${color}18, ${color}08)`,
            border: `1px solid ${color}30`,
            boxShadow: `0 0 30px ${color}12`,
          }}>
          {icon}
          <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
            style={{ background: color, color: '#0B0F14', boxShadow: `0 0 14px ${color}55` }}>
            {step}
          </div>
        </div>
        <h3 className="font-black text-white text-xl mb-3">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed max-w-[260px]">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Stat counter ───────────────────────────────── */
function StatItem({ value, suffix, label, delay }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const target = parseInt(String(value).replace(/\D/g, ''));

  useEffect(() => {
    if (!inView) return;
    const dur = 1800;
    const step = target / (dur / 16);
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(Math.floor(cur));
      if (cur >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [inView, target]);

  return (
    <motion.div ref={ref}
      initial="hidden" animate={inView ? 'show' : 'hidden'} variants={stagger(delay)}
      className="text-center">
      <p className="text-4xl md:text-5xl font-black text-white mb-2">
        {count.toLocaleString()}<span className="text-accent">{suffix}</span>
      </p>
      <p className="text-white/35 text-sm font-medium">{label}</p>
    </motion.div>
  );
}

/* ── Testimonial card ───────────────────────────── */
function TestimonialCard({ name, loc, quote, avatar, color, delay }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref}
      initial="hidden" animate={inView ? 'show' : 'hidden'} variants={stagger(delay)}
      className="relative rounded-2xl p-6 border border-white/6 group hover:border-accent/20 transition-all duration-500"
      style={{
        background: 'linear-gradient(145deg, rgba(17,24,39,0.9), rgba(11,15,20,0.95))',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div className="absolute top-4 right-5 text-6xl font-black text-white/4 leading-none select-none">"</div>
      <p className="text-white/55 text-sm leading-relaxed mb-6 relative z-10">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-base flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})`, boxShadow: `0 0 14px ${color[0]}44` }}>
          {avatar}
        </div>
        <div>
          <p className="font-bold text-white text-sm">{name}</p>
          <p className="text-white/30 text-xs">{loc}</p>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── CTA Banner ─────────────────────────────────── */
function CTABanner({ onCTA }) {
  const ref = useRef();
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(99,102,241,0.08))',
        border: '1px solid rgba(6,182,212,0.18)',
        boxShadow: '0 0 60px rgba(6,182,212,0.07), 0 40px 80px rgba(0,0,0,0.4)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />
      <div className="relative z-10">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
          Your people are<br />
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #67E8F9, #06B6D4)' }}>
            already waiting.
          </span>
        </h2>
        <p className="text-white/40 text-base md:text-lg mb-10 max-w-lg mx-auto">
          Join thousands of people who discovered their communities, made lifelong friends, and built real connections.
        </p>
        <motion.button onClick={onCTA}
          whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(6,182,212,0.65), 0 0 100px rgba(6,182,212,0.2)' }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg text-bg"
          style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 32px rgba(6,182,212,0.5)' }}
        >
          Start for Free Today
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </motion.button>
        <p className="text-white/20 text-sm mt-5">No credit card required · Free forever</p>
      </div>
    </motion.div>
  );
}

/* ══ MAIN LANDING ══════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ['rgba(11,15,20,0)', 'rgba(11,15,20,0.97)']);
  const navBorder = useTransform(scrollY, [0, 80], ['rgba(30,41,59,0)', 'rgba(30,41,59,0.8)']);

  const handleMouseMove = useCallback((e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    rawX.set(e.clientX - left - width  / 2);
    rawY.set(e.clientY - top  - height / 2);
  }, [rawX, rawY]);

  const goLogin = () => navigate('/login');
  const NAV_LINKS = ['Features', 'Stories', 'Community'];

  return (
    <div className="min-h-screen bg-bg text-white overflow-x-hidden">

      {/* ── NAVBAR ──────────────────────────────── */}
      <motion.nav
        style={{ backgroundColor: navBg, borderBottomColor: navBorder }}
        className="fixed top-0 inset-x-0 z-50 border-b border-transparent"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 16px rgba(6,182,212,0.45)' }}>
              <svg className="w-4 h-4 text-bg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-black text-lg tracking-tight">
              <span className="text-white">Social</span><span className="text-accent">App</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-sm font-medium text-white/55 hover:text-white transition-colors">
              Home
            </button>
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="text-sm font-medium text-white/55 hover:text-white transition-colors">
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={goLogin}
              className="px-4 py-2 text-sm font-semibold text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/5">
              Login
            </button>
            <motion.button onClick={goLogin}
              whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(6,182,212,0.6)' }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2 rounded-xl text-sm font-bold text-bg"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 18px rgba(6,182,212,0.38)' }}>
              Sign Up Free
            </motion.button>
          </div>

          <button className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen(v => !v)}>
            <span className={`block w-5 h-0.5 bg-white/70 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white/70 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white/70 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-brd"
              style={{ backgroundColor: 'rgba(11,15,20,0.98)' }}
            >
              <div className="px-5 py-4 space-y-1">
                {['Home', ...NAV_LINKS].map(l => (
                  <button key={l} onClick={() => setMenuOpen(false)}
                    className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 transition-all">
                    {l}
                  </button>
                ))}
                <div className="pt-3 flex flex-col gap-2.5">
                  <button onClick={goLogin}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-brd text-white/60 hover:border-accent/40 hover:text-white transition-all">
                    Login
                  </button>
                  <button onClick={goLogin}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-bg"
                    style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                    Sign Up Free
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── HERO ────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Background radial */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(30,41,59,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.22) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 75% 65% at 50% 0%, black 20%, transparent 100%)',
          }} />

        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map(p => (
            <div key={p.id} className="absolute rounded-full bg-accent"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                opacity: p.opacity,
                animation: `particleFloat ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
              }} />
          ))}
        </div>

        {/* Ambient glows */}
        <div className="absolute pointer-events-none"
          style={{
            top: '30%', left: '20%', width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
            transform: 'translate(-50%,-50%)',
          }} />
        <div className="absolute pointer-events-none"
          style={{
            bottom: '20%', right: '15%', width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            transform: 'translate(50%,50%)',
          }} />

        {/* Floating profile cards — desktop only */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          {CARDS.map(c => (
            <ProfileCard key={c.name} card={c} mouseX={rawX} mouseY={rawY} />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-5 pt-24 pb-16">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-bold uppercase tracking-widest"
            style={{
              background: 'rgba(6,182,212,0.07)',
              border: '1px solid rgba(6,182,212,0.22)',
              color: '#67E8F9',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Social Discovery Platform · Now Available
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-black leading-[1.02] tracking-tight mb-6"
          >
            <span className="text-white">Find Your</span>
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #67E8F9 0%, #06B6D4 45%, #38BDF8 100%)' }}
            >
              People
            </span>
            <br />
            <span className="text-white">Here.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Move beyond scrolling. Connect with like-minded individuals, discover communities built around your passions, and build real friendships that last.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.33, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button onClick={goLogin}
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(6,182,212,0.65), 0 0 80px rgba(6,182,212,0.18)' }}
              whileTap={{ scale: 0.97 }}
              className="relative w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-bg overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                boxShadow: '0 0 28px rgba(6,182,212,0.42), 0 0 60px rgba(6,182,212,0.1)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2 justify-center">
                Create Account — It's Free
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.button>

            <motion.button onClick={goLogin}
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.5)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base text-white/65 hover:text-white border border-white/10 transition-colors duration-300"
            >
              Login to Account
            </motion.button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {['#7C3AED','#DB2777','#0891B2','#D97706'].map((c, i) => (
                  <div key={i}
                    className="w-7 h-7 rounded-full border-2 border-bg flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${c}, ${c}99)` }}>
                    {['A','S','M','L'][i]}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-white/35">10,000+ members</span>
            </div>
            <span className="hidden sm:block w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-sm font-medium text-white/35 ml-1">4.9 rating</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }}
        >
          <span className="text-[10px] text-white/20 font-medium tracking-[0.2em] uppercase">Explore</span>
          <div className="w-5 h-8 rounded-full border border-white/12 flex items-start justify-center pt-1.5">
            <motion.div className="w-1 h-1.5 rounded-full bg-accent"
              animate={{ y: [0, 13, 0] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────── */}
      <section id="features" className="py-24 md:py-36 px-5 md:px-8 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brd to-transparent" />
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="✦ Platform Features"
            title="Everything you need to"
            highlight="connect."
            sub="Built for real human connection. Every feature is designed to help you discover, engage, and form relationships that actually matter."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🌐', title: 'Discover People',     desc: 'Find like-minded individuals across the globe. Filter by interests, hobbies, and communities to meet your ideal circle.', color: '#06B6D4', delay: 0 },
              { icon: '💬', title: 'Real Conversations',  desc: 'Rich messaging with voice calls, media sharing, and reactions. No bots, no algorithms suppressing you — just humans.', color: '#7C3AED', delay: 0.08 },
              { icon: '👥', title: 'Join Communities',    desc: 'Find your tribe in shared spaces. Gaming, art, fitness, tech — there is a community for every passion and personality.', color: '#10B981', delay: 0.16 },
              { icon: '🎙️', title: 'Voice Calling',       desc: 'Crystal-clear 1-on-1 voice calls with friends directly in the app. No third-party apps, no friction.', color: '#F59E0B', delay: 0.24 },
              { icon: '📸', title: 'Share Moments',       desc: 'Post photos, react to stories, and show the world who you are. Your profile is your story.', color: '#EF4444', delay: 0.32 },
              { icon: '🛡️', title: 'Safe & Private',      desc: 'Your privacy matters. Control exactly who sees your profile, posts, and personal information at all times.', color: '#06B6D4', delay: 0.4 },
            ].map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────── */}
      <section id="stories" className="py-24 md:py-36 px-5 md:px-8 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brd to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brd to-transparent" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(99,102,241,0.035) 0%, transparent 70%)' }} />
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            badge="✦ How It Works"
            title="Three steps to your"
            highlight="community."
            sub="Getting started takes less than a minute."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
            {[
              {
                step: '01', icon: '✏️', title: 'Create Your Profile',
                desc: 'Tell the world who you are. Add your interests, photos, and a bio that reflects your real personality.',
                color: '#06B6D4',
              },
              {
                step: '02', icon: '🔍', title: 'Discover & Connect',
                desc: 'Browse people who share your passions. Send a friend request — it is the first step to every great friendship.',
                color: '#7C3AED',
              },
              {
                step: '03', icon: '🚀', title: 'Build Real Bonds',
                desc: 'Chat, call, share moments, and grow your social circle. This is where strangers become lifelong friends.',
                color: '#10B981',
              },
            ].map((s, i) => (
              <StepCard key={s.step} {...s} isLast={i === 2} delay={i * 0.14} />
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────── */}
      <section className="py-20 md:py-28 px-5 md:px-8 relative">
        <div className="absolute inset-0 border-y border-white/4 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.025), rgba(99,102,241,0.025))' }} />
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            <StatItem value={10000}   suffix="+" label="Active Members"    delay={0} />
            <StatItem value={50}      suffix="+" label="Countries"         delay={0.1} />
            <StatItem value={1000000} suffix="+" label="Connections Made"  delay={0.2} />
            <StatItem value={99}      suffix="%" label="User Satisfaction" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────── */}
      <section id="community" className="py-24 md:py-36 px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            badge="✦ Real Stories"
            title="People who found their"
            highlight="people."
            sub="Thousands of real friendships started here. Here is what they have to say."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Zara Ahmed', loc: 'Toronto, Canada', avatar: 'Z', color: ['#7C3AED','#4F46E5'],
                quote: "I moved to a new city and didn't know anyone. Within two weeks I found my hiking group, my study partner, and honestly my best friend here. This place genuinely changed my life.",
                delay: 0,
              },
              {
                name: 'Kai Nomura', loc: 'Tokyo, Japan', avatar: 'K', color: ['#0891B2','#0E7490'],
                quote: "As a developer it's hard to meet people outside of work. Here I found a community of coders, artists, and musicians who push me to grow every day. The voice calls make it feel real.",
                delay: 0.1,
              },
              {
                name: 'Priya Sharma', loc: 'Mumbai, India', avatar: 'P', color: ['#DB2777','#9D174D'],
                quote: "People here actually want to connect, not just collect followers. My friend group from this platform is closer than people I've known for years. It's different in the best way.",
                delay: 0.2,
              },
            ].map(t => <TestimonialCard key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────── */}
      <section className="py-20 md:py-24 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <CTABanner onCTA={goLogin} />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="border-t border-brd py-14 px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 0 14px rgba(6,182,212,0.38)' }}>
                  <svg className="w-4 h-4 text-bg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-black text-lg">
                  <span className="text-white">Social</span><span className="text-accent">App</span>
                </span>
              </div>
              <p className="text-white/25 text-sm max-w-xs leading-relaxed">
                A social discovery platform where strangers become real friends.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/30">
              {['Features', 'Stories', 'Community', 'Privacy', 'Terms'].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-brd flex flex-col sm:flex-row items-center justify-between gap-4 text-white/18 text-xs">
            <p>© 2025 SocialApp. All rights reserved.</p>
            <p>Made with care for real human connection.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
