import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BadgeModal from '../../components/BadgeModal';

export default function Confirmation() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [showBadge, setShowBadge] = useState(false);

  const result  = state?.result;
  const company = state?.company;

  if (!result) {
    navigate(`/visit/${slug}`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Company logo */}
        {company?.logo_url && (
          <img src={company.logo_url} alt={company.name}
            className="h-14 w-auto max-w-[160px] object-contain mx-auto mb-5 rounded-xl" />
        )}

        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Checked In!</h1>
        <p className="text-gray-500 mb-8">Your visit has been registered successfully.</p>

        {/* Reference number — prominent */}
        {result.ref_number && (
          <div className="bg-white border-2 border-green-300 rounded-2xl px-6 py-4 mb-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Reference Number</p>
            <p className="text-3xl font-bold text-gray-900 tracking-wider font-mono">{result.ref_number}</p>
            <p className="text-xs text-gray-400 mt-1">Please quote this number for any queries</p>
          </div>
        )}

        {/* Queue position */}
        {result.queue_ahead !== undefined && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-4 mb-4 text-center">
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-2">Your Queue Position</p>
            {result.queue_ahead === 0 ? (
              <div>
                <p className="text-2xl font-bold text-green-600">You're next!</p>
                <p className="text-sm text-gray-500 mt-1">No one is ahead of you with {result.employee_name}</p>
              </div>
            ) : (
              <div>
                <p className="text-5xl font-bold text-amber-600">{result.queue_ahead}</p>
                <p className="text-sm text-gray-600 mt-1">
                  visitor{result.queue_ahead !== 1 ? 's' : ''} ahead of you with <strong>{result.employee_name}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="card text-left space-y-3 mb-6">
          <dl className="text-sm space-y-2">
            {result.service_name && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Service</dt>
                <dd className="font-medium text-gray-900">{result.service_name}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Associate</dt>
              <dd className="font-medium text-gray-900">{result.employee_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Visit Time</dt>
              <dd className="font-medium text-gray-900">
                {new Date(result.visit_time).toLocaleString('en-IN', {
                  hour12: true, day: '2-digit', month: 'short',
                  year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </dd>
            </div>
            {!result.ref_number && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Visit ID</dt>
                <dd className="font-medium text-gray-900">#{result.visit_id}</dd>
              </div>
            )}
          </dl>
        </div>

        {result.whatsapp_sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 mb-6">
            ✅ A WhatsApp notification has been sent to <strong>{result.employee_name}</strong>.
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 mb-6">
            ℹ️ Please wait at the reception. The associate will be notified.
          </div>
        )}

        <button
          onClick={() => setShowBadge(true)}
          className="w-full mb-3 py-3 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4H9v4a1 1 0 001 1zm1-4h4m-4-8V4a1 1 0 00-1-1H9a1 1 0 00-1 1v4h8z" />
          </svg>
          Print Visitor Badge
        </button>

        <button
          onClick={() => navigate(`/visit/${slug}`, { replace: true })}
          className="btn-secondary w-full py-3 text-base"
        >
          Done
        </button>
        {company && <p className="text-gray-400 text-xs mt-4">Thank you for visiting {company.name}</p>}

        {showBadge && (
          <BadgeModal
            visit={result}
            companyName={company?.name || ''}
            onClose={() => setShowBadge(false)}
          />
        )}
      </div>
    </div>
  );
}
