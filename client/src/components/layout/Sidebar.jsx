import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const navItems = [
  {
    to: '/', label: 'Home', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    to: '/chats', label: 'Chats', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )
  },
  {
    to: '/match', label: 'Find Friends', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    to: '/video', label: 'Video Call', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    to: '/profile', label: 'Profile', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
];

export default function Sidebar() {
  const { currentUser, logout } = useApp();

  return (
    <div className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-card border-r border-brd z-40 py-8 px-4">
      {/* Logo */}
      <div className="mb-10 px-2">
        <span className="text-2xl font-black tracking-tight">
          <span className="text-white">Social</span>
          <span className="text-accent" style={{ textShadow: '0 0 20px rgba(6,182,212,0.6)' }}>App</span>
        </span>
        <div className="h-0.5 w-16 bg-gradient-to-r from-accent to-transparent mt-1 rounded-full" />
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'nav-active'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-full"
                    style={{ boxShadow: '0 0 8px #06B6D4' }} />
                )}
                <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {currentUser && (
        <div className="mt-auto">
          <div className="h-px bg-brd mb-4" />
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            {currentUser.avatar ? (
              <img src={`${currentUser.avatar}`} className="w-9 h-9 rounded-full object-cover ring-2 ring-accent/30" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-cyan-300 flex items-center justify-center text-bg font-black text-sm ring-2 ring-accent/30">
                {currentUser.displayName?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentUser.displayName}</p>
              <p className="text-xs text-white/30 truncate">@{currentUser.username}</p>
            </div>
            <button onClick={logout} className="text-white/20 hover:text-accent transition-colors p-1" title="Switch user">
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
