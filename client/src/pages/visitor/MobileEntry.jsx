import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function MobileEntry() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);

  useEffect(() => {
    api.get(`/visitors/office/${slug}`)
      .then(({ data }) => setCompany(data.company))
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Company header */}
        <div className="text-center mb-10">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-20 w-20 object-contain mx-auto mb-4 rounded-xl" />
          ) : (
            <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏢</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          {company.address && <p className="text-gray-500 text-sm mt-1">{company.city || company.address}</p>}
          <p className="text-gray-400 text-sm mt-4">Welcome! Please enter your mobile number to check in.</p>
        </div>

        <div className="card">
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

          {/* QR code for phone users */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 text-center">Or scan from your phone to check in</p>
            <div className="bg-white p-3 rounded-xl border border-gray-200 inline-block">
              <QRCodeSVG
                value={window.location.href}
                size={100}
                level="H"
                includeMargin={false}
                {...(company?.logo_url ? { imageSettings: { src: company.logo_url, height: 22, width: 22, excavate: true } } : {})}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
