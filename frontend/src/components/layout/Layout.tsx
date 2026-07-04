import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TrialBanner from '../TrialBanner';
import { useAppStore } from '../../store';

export default function Layout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <TrialBanner />
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
