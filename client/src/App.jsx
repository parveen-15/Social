import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Chats from './pages/Chats';
import Match from './pages/Match';
import VideoCall from './pages/VideoCall';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';

function AppRoutes() {
  const { currentUser, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ boxShadow: '0 0 20px rgba(6,182,212,0.5)' }} />
          <p className="text-white/30 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  /* Not logged in → Landing or Auth */
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/"      element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /* Logged in but onboarding not done */
  if (!currentUser.onboardingComplete) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*"           element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  /* Fully authenticated */
  return (
    <Layout>
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/chats"   element={<Chats />} />
        <Route path="/match"   element={<Match />} />
        <Route path="/video"   element={<VideoCall />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:identifier" element={<UserProfile />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
