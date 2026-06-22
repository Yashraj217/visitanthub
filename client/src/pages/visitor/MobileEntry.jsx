import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

function fmt12(t) {
  if (!t) return '';
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function MobileEntry() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);

  useEffect(() => {
    api.get(`/visitors/office/${slug}`)
      .then(({ data }) => {
        setCompany(data.company);
        setAvailability(data.availability || []);
      })
      .catch(() => toast.error('Office not found'))
      .finally(() => setCompanyLoading(false));
  }, [slug]);

  async function handleNext(e) {
    e.preventDefault();
    if (!mobile.trim() || mobile.length < 7) return toast.error('Enter a valid mobile number');
    setLoading(true);
    try {
      const { data } = await api.post(`/visitors/office/${slug}/check-mobile`, { mobile: mobile.trim() });
      navigate(`/visit/${slug}/details`, {
        state: { mobile: mobile.trim(), visitor: data.visitor || null },
      });
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🏢</p>
          <h2 className="text-xl font-semibold text-gray-700">Office not found</h2>
          <p className="text-gray-400 mt-2">This visitor link is invalid or the office is inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-stretch">

      {/* Left column — logo (desktop only) */}
      {company.logo_url && (
        <div className="hidden md:flex w-1/2 items-center justify-center p-12 bg-white/40 border-r border-white/60">
          <img
            src={company.logo_url}
            alt={company.name}
            className="rounded-3xl"
            style={{ maxWidth: '100%', maxHeight: '60vh' }}
          />
        </div>
      )}

      {/* Right column — form */}
      <div className={`flex-1 flex items-center justify-center px-6 py-10 ${!company.logo_url ? 'md:w-full' : ''}`}>
        <div className="w-full max-w-sm">
          {/* Logo — mobile only (shown above form) */}
          {company.logo_url && (
            <div className="flex justify-center mb-6 md:hidden">
              <img
                src={company.logo_url}
                alt={company.name}
                className="rounded-2xl"
                style={{ maxWidth: '100%', maxHeight: '200px' }}
              />
            </div>
          )}

          {/* Company name + address */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            {company.address && <p className="text-gray-500 text-sm mt-1">{company.city || company.address}</p>}
            <p className="text-gray-400 text-sm mt-4">Welcome! Please enter your mobile number to check in.</p>
          </div>

          {/* Mobile entry form */}
          <div className="card mb-5">
            <form onSubmit={handleNext} className="space-y-5">
              <div>
                <label className="label text-base">Your Mobile Number</label>
                <input
                  type="tel"
                  className="input text-xl py-3 tracking-wider text-center"
                  placeholder="98765 43210"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  maxLength={15}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? 'Checking…' : 'Continue →'}
              </button>
            </form>
          </div>

          {/* Associates availability */}
          {availability.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-base">🕐</span> Today's Availability
              </h2>
              <div className="space-y-3">
                {availability.map((a, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.employee_name}</p>
                      {a.designation && <p className="text-xs text-gray-400 truncate">{a.designation}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {a.slots.map((s, j) => (
                        <p key={j} className="text-xs text-indigo-600 font-medium">
                          {fmt12(s.start_time)} – {fmt12(s.end_time)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
