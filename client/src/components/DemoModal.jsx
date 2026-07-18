import { useState } from 'react';
import api from '../services/api';

export default function DemoModal({ onClose }) {
  const [form, setForm]         = useState({ name: '', company_name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/demo', form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 z-10"
        onClick={e => e.stopPropagation()}>

        <button onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {done ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Received!</h3>
            <p className="text-gray-500 text-sm mb-6">
              Thanks! Our team will reach out to you within 24 hours to schedule your personalised demo.
            </p>
            <button onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Request a Free Demo</h3>
              <p className="text-gray-500 text-sm">Fill in your details and our team will contact you to set up a personalised walkthrough.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Your Name *</label>
                  <input value={form.name} onChange={set('name')} required
                    placeholder="Dr. Rajesh Kumar"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Clinic / Company Name *</label>
                  <input value={form.company_name} onChange={set('company_name')} required
                    placeholder="Sunrise Eye Hospital"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={set('email')} required
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} required
                    placeholder="+91 98765 43210"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Message <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea value={form.message} onChange={set('message')} rows={3}
                  placeholder="Tell us about your setup — number of doctors, daily patient count, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {submitting ? 'Submitting…' : 'Request Demo →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
