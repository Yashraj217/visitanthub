import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ImpersonationBanner() {
  const { user, impersonating, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!impersonating) return null;

  function handleExit() {
    stopImpersonation();
    navigate('/super-admin', { replace: true });
  }

  const roleLabel = user?.role === 'company_admin' ? 'Company Admin' : 'Associate';

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shrink-0">
      <span className="flex items-center gap-2">
        <span className="text-base">👁</span>
        Impersonating <strong className="ml-1">{user?.name}</strong>
        {user?.company_name && <span className="opacity-80">— {user.company_name}</span>}
        <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full ml-1">{roleLabel}</span>
      </span>
      <button
        onClick={handleExit}
        className="ml-4 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors font-semibold whitespace-nowrap"
      >
        ✕ Exit Impersonation
      </button>
    </div>
  );
}
