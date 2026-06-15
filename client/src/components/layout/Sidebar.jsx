import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const navItems = [
  {
    to: '/', label: 'Home', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    to: '/chats', label: 'Messages', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )
  },
  {
    to: '/match', label: 'Discover', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    to: '/video', label: 'Video', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    to: '/profile', label: 'Profile', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
];

export default function Sidebar() {
  const { currentUser, logout } = useApp();

  return (
    <div className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 z-40 py-6 px-3"
      style={{ background: 'linear-gradient(180deg, #09101E 0%, #080C14 100%)', borderRight: '1px solid #1A2744' }}>

      {/* Logo */}
      <div className="mb-8 px-3 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Logo"
          className="h-9 w-auto object-contain"
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
        />
        <div style={{ display: 'none' }}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.5)]">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-base leading-none tracking-tight">SocialApp</p>
          <p className="text-xs text-muted mt-0.5">Connect & Discover</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 relative group ${
                isActive ? 'nav-active text-accent-light' : 'text-white/40 hover:text-white/80 hover:bg-white/4'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r-full"
                    style={{ boxShadow: '0 0 6px #3B82F6' }} />
                )}
                <span className={`transition-colors ${isActive ? 'text-accent' : 'text-white/40 group-hover:text-white/70'}`}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {currentUser && (
        <div className="mt-4">
          <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, transparent, #1A2744, transparent)' }} />
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.border = '1px solid #1A2744'}
            onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
            {currentUser.avatar ? (
              <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover ring-2 ring-accent/20" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-xs ring-2 ring-accent/20">
                {currentUser.displayName?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
              <p className="text-xs text-muted truncate">@{currentUser.username}</p>
            </div>
            <button onClick={logout}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-400/10"
              title="Logout">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
