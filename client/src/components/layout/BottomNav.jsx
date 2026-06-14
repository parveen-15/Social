import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const navItems = [
  {
    to: '/', label: 'Home', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    to: '/chats', label: 'Chats', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )
  },
  {
    to: '/match', label: 'Match', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  {
    to: '/video', label: 'Video', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    to: '/profile', label: 'Profile', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
];

export default function BottomNav() {
  const { unreadCount, setUnreadCount, notifications } = useApp();
  const location = useLocation();

  // Count unread by type for specific tabs
  const msgCount = notifications.filter(n => n.type === 'message').length;
  const postCount = notifications.filter(n => n.type === 'new_post' || n.type === 'comment').length;

  // Clear count when visiting relevant page
  useEffect(() => {
    if (location.pathname === '/chats') setUnreadCount(c => Math.max(0, c - msgCount));
    if (location.pathname === '/') setUnreadCount(c => Math.max(0, c - postCount));
  }, [location.pathname]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-brd z-40"
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(17,24,39,0.95)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around py-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                isActive ? 'text-accent' : 'text-white/30 hover:text-white/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? 'drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : ''}`}>
                  {item.icon}
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                  {!isActive && item.to === '/chats' && msgCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                      {msgCount > 9 ? '9+' : msgCount}
                    </span>
                  )}
                  {!isActive && item.to === '/' && postCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
                <span className={`text-xs font-semibold ${isActive ? 'text-accent' : ''}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
