import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <BottomNav />
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
