import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { io } from 'socket.io-client';
import { auth } from '../firebase';
import { getUser, syncAuthUser } from '../utils/api';

const AppContext = createContext(null);
export const AuthErrorContext = createContext(null);

async function askNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
}

async function showPushNotification(title, body, url = '/') {
  if (Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: '/icon-192.png', data: { url }, vibrate: [200, 100, 200] });
    } else {
      new Notification(title, { body });
    }
  } catch {
    new Notification(title, { body });
  }
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser]     = useState(null);
  const [firebaseUser, setFirebaseUser]   = useState(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [syncing, setSyncing]             = useState(false);
  const [syncError, setSyncError]         = useState('');
  const [socket, setSocket]               = useState(null);
  const [onlineUsers, setOnlineUsers]     = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  const connectSocket = useCallback((user) => {
    const backendUrl = import.meta.env.VITE_API_URL || '';
    const s = io(backendUrl, { query: { userId: user._id }, transports: ['websocket', 'polling'] });

    s.on('user_online', ({ userId, isOnline }) =>
      setOnlineUsers(prev => ({ ...prev, [userId]: isOnline })));

    const addNotif = (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 49)]);
      setUnreadCount(c => c + 1);
    };
    s.on('conversation_updated', (data) => {
      addNotif({ ...data, type: 'message' });
      if (document.hidden) showPushNotification('New Message', data.lastMessage?.text || 'New message', '/chats');
    });
    s.on('friend_request_received', (data) => {
      addNotif({ ...data, type: 'friend_request' });
      if (document.hidden) showPushNotification('Friend Request', `${data.fromName || 'Someone'} sent you a friend request`, '/match');
    });
    s.on('new_comment', (data) => {
      addNotif({ ...data, type: 'comment' });
      if (document.hidden) showPushNotification('New Comment', `${data.fromName} commented on your post`, '/');
    });
    s.on('new_friend_post', (data) => {
      addNotif({ ...data, type: 'new_post' });
      if (document.hidden) showPushNotification('New Post', `${data.fromName} shared a new post`, '/');
    });

    setSocket(s);
    return s;
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        setSyncError('');
        setSyncing(true);
        const rawId = fbUser.providerData[0]?.providerId || 'password';
        const provider = rawId === 'password' ? 'email'
          : rawId === 'google.com' ? 'google'
          : rawId === 'phone' ? 'phone'
          : 'email';
        const res = await syncAuthUser(provider);
        const user = res.data;
        setCurrentUser(user);
        connectSocket(user);
        await askNotificationPermission();
      } catch (err) {
        setCurrentUser(null);
        const msg = err?.code === 'ECONNABORTED'
          ? 'Server took too long to respond. Is the server running?'
          : err?.response?.data?.error || err?.message || 'Server error. Is the server running?';
        setSyncError(msg);
        console.error('Auth sync failed:', msg);
      } finally {
        setSyncing(false);
        setAuthLoading(false);
      }
    });
    return unsub;
  }, [connectSocket]);

  useEffect(() => {
    return () => { if (socket) socket.disconnect(); };
  }, [socket]);

  const refreshCurrentUser = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await getUser(currentUser._id);
      setCurrentUser(res.data);
    } catch {}
  }, [currentUser]);

  const logout = useCallback(async () => {
    if (socket) socket.disconnect();
    setSocket(null);
    setCurrentUser(null);
    setFirebaseUser(null);
    await signOut(auth);
  }, [socket]);

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      firebaseUser,
      loading: authLoading,
      syncing,
      syncError, setSyncError,
      socket, onlineUsers,
      notifications, setNotifications,
      unreadCount, setUnreadCount,
      refreshCurrentUser,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
