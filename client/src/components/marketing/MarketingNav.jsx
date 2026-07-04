import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing',  to: '/pricing' },
  { label: 'About',    to: '/about' },
  { label: 'Contact',  to: '/contact' },
];

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isActive = (to) => pathname === to;

  const dashboardLink =
    user?.role === 'super_admin'   ? '/super-admin' :
    user?.role === 'company_admin' ? '/dashboard' :
    user?.role === 'company_user'  ? '/user-portal' : null;

  function handleSignOut() {
    logout();
    navigate('/');
    setMobileOpen(false);
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <img src="/VisitantHub_Main_Logo.png" alt="VisitantHub" className="h-14 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              to={item.to}
              className={`text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-500'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {dashboardLink ? (
            <>
              <Link
                to={dashboardLink}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all hover:opacity-90 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`text-sm font-medium transition-colors ${
                  isActive('/login') ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-1 shadow-lg">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2 px-2 rounded-lg transition-colors ${
                isActive(item.to)
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-gray-100 mt-2">
            {dashboardLink ? (
              <>
                <Link
                  to={dashboardLink}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-semibold px-4 py-2.5 rounded-lg text-white text-center"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-700 py-2 px-2 hover:text-red-600 transition-colors text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-gray-700 py-2 px-2 hover:text-indigo-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-semibold px-4 py-2.5 rounded-lg text-white text-center"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
