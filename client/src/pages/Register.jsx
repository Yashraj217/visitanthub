import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const initial = {
  company_name: '', company_email: '', company_phone: '', company_address: '',
  admin_name: '', admin_email: '', admin_password: '', confirm_password: '',
};

export default function Register() {
  const refCode = new URLSearchParams(window.location.search).get('ref') || '';
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.admin_password !== form.confirm_password) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await api.post('/auth/register', { ...form, referral_code: refCode });
      setRegisteredEmail(form.admin_email);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 px-4">
        <div className="w-full max-w-md">
          <div className="card text-center py-10 px-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 mb-2">
              We sent a verification link to
            </p>
            <p className="text-indigo-600 font-semibold mb-6">{registeredEmail}</p>
            <p className="text-gray-400 text-sm mb-8">
              Click the link in the email to activate your account. The link expires in 24 hours.
            </p>
            <Link to="/login" className="text-primary-600 font-medium hover:underline text-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Register Your Office</h2>
          <p className="text-gray-500 mt-2">Create your visitor management account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Company Name *</label>
                  <input className="input" required placeholder="ABC Corp" value={form.company_name} onChange={set('company_name')} />
                </div>
                <div>
                  <label className="label">Company Email *</label>
                  <input type="email" className="input" required placeholder="info@company.com" value={form.company_email} onChange={set('company_email')} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+91 98765 43210" value={form.company_phone} onChange={set('company_phone')} />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" placeholder="Office address" value={form.company_address} onChange={set('company_address')} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Admin Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Your Name *</label>
                  <input className="input" required placeholder="John Doe" value={form.admin_name} onChange={set('admin_name')} />
                </div>
                <div>
                  <label className="label">Admin Email *</label>
                  <input type="email" className="input" required placeholder="admin@company.com" value={form.admin_email} onChange={set('admin_email')} />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input type="password" className="input" required placeholder="Min 8 characters" value={form.admin_password} onChange={set('admin_password')} />
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <input type="password" className="input" required placeholder="Repeat password" value={form.confirm_password} onChange={set('confirm_password')} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
