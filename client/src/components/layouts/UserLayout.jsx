import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../ChangePasswordModal';
import ImpersonationBanner from '../ImpersonationBanner';
import api from '../../services/api';

const navItems = [
  { to: '/user-portal',        label: 'Dashboard', icon: '📊', exact: true },
  { to: '/user-portal/visits', label: 'My Visits', icon: '📋', exact: true },
  { to: '/user-portal/help',   label: 'Help',      icon: '❓', exact: true },
];

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function openHelp() {
    navigate('/user-portal/help');
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ImpersonationBanner />

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center gap-3 px-4 py-3 text-white shrink-0"
        style={{ backgroundColor: user?.company_sidebar_color || '#111827' }}>
        <button onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold text-sm truncate">{user?.company_name}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col shrink-0 transition-transform duration-200
            lg:static lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ backgroundColor: user?.company_sidebar_color || '#111827' }}
        >
          {/* Mobile close button */}
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-3 right-3 p-1.5 rounded hover:bg-white/10 text-white/70">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-6 py-5 border-b border-white/10">
            {user?.company_logo ? (
              <img src={user.company_logo} alt={user.company_name}
                className="h-10 w-auto max-w-[140px] object-contain mb-3 rounded" />
            ) : null}
            <h1 className="text-lg font-bold text-white truncate">{user?.company_name}</h1>
            <p className="text-white/50 text-sm mt-1 truncate">{user?.name}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full">
              Associate Portal
            </span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map(({ to, label, icon, exact }) => (
              <NavLink
                key={to} to={to} end={exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span>{icon}</span>{label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-white/10">
            <button onClick={openHelp}
              className="w-full text-left px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need Help?
            </button>
            <button onClick={() => setShowChangePwd(true)}
              className="w-full text-left px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              Change Password
            </button>
            <button onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-gray-50 min-w-0">
          <Outlet />
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
