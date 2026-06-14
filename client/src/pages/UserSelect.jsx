import { useApp } from '../context/AppContext';

function Star({ style }) {
  return <div className="absolute animate-twinkle text-accent/60 select-none pointer-events-none" style={style}>✦</div>;
}

export default function UserSelect() {
  const { demoUsers, selectDemoUser, loading } = useApp();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 overflow-hidden relative">

      {/* Stars */}
      <Star style={{ top: '8%', left: '12%', fontSize: 10, animationDelay: '0s' }} />
      <Star style={{ top: '15%', left: '75%', fontSize: 14, animationDelay: '0.5s' }} />
      <Star style={{ top: '25%', left: '30%', fontSize: 8, animationDelay: '1s' }} />
      <Star style={{ top: '60%', left: '88%', fontSize: 12, animationDelay: '1.5s' }} />
      <Star style={{ top: '70%', left: '5%', fontSize: 10, animationDelay: '2s' }} />
      <Star style={{ top: '85%', left: '55%', fontSize: 8, animationDelay: '0.7s' }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-cyan-900/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Kissing animation */}
        <div className="flex items-end justify-center gap-1 mb-6 h-20 relative">
          <span className="absolute text-lg pointer-events-none select-none"
            style={{ left: '40%', bottom: '60%', animation: 'floatHeart 2.5s ease-out infinite' }}>❤️</span>
          <span className="absolute text-lg pointer-events-none select-none"
            style={{ left: '50%', bottom: '55%', animation: 'floatHeart 2.5s ease-out 0.7s infinite' }}>💕</span>
          <span className="absolute text-lg pointer-events-none select-none"
            style={{ left: '45%', bottom: '65%', animation: 'floatHeart 2.5s ease-out 1.3s infinite' }}>✨</span>

          <div className="animate-kiss-left origin-bottom flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-cyan-300 flex items-center justify-center text-xl shadow-lg shadow-accent/30">👩</div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-accent/40 to-accent/10 -mt-1" />
          </div>

          <div className="flex flex-col items-center pb-2 mx-1">
            <div className="text-2xl animate-sparkle">💋</div>
          </div>

          <div className="animate-kiss-right origin-bottom flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-300 to-accent flex items-center justify-center text-xl shadow-lg shadow-accent/30">👨</div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-accent/40 to-accent/10 -mt-1" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6 animate-slide-up-1">
          <h1 className="text-4xl sm:text-5xl font-black mb-1 tracking-tight">
            <span className="text-white">Social</span>
            <span className="text-accent" style={{ textShadow: '0 0 30px rgba(6,182,212,0.8)' }}>App</span>
          </h1>
          <p className="text-white/40 text-xs tracking-widest uppercase">Strangers become friends here</p>
        </div>

        {/* Card */}
        <div className="card p-5 animate-slide-up-2"
          style={{ boxShadow: '0 0 40px rgba(6,182,212,0.08), 0 20px 60px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-accent" />
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Choose your account</p>
          </div>

          <div className="space-y-2">
            {demoUsers.map((user, i) => (
              <button
                key={user.username}
                onClick={() => selectDemoUser(user)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-brd
                  hover:border-accent/50 hover:bg-accent/5 active:bg-accent/10
                  transition-all duration-200 group disabled:opacity-40 text-left"
                style={{ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.07}s both`, minHeight: 56 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-cyan-300 flex items-center justify-center text-bg font-black text-base flex-shrink-0 shadow-md group-hover:shadow-accent/30 transition-shadow">
                  {user.displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm group-hover:text-accent transition-colors">{user.displayName}</p>
                  <p className="text-xs text-white/30">@{user.username}</p>
                </div>
                <svg className="w-4 h-4 text-white/20 group-hover:text-accent transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-white/40 text-sm">Entering the world...</span>
          </div>
        )}

        <p className="text-center text-xs text-white/20 mt-5">No password needed ✨</p>
      </div>
    </div>
  );
}
